
import { useState } from "react";
import type {
  Tile,
  TileType,
  GamePlayer,
  GameState,
} from "../types";
import "./GameBoard.css";

interface GameBoardProps {
  tiles: Tile[];
  players: GamePlayer[];
  ownership: GameState["ownership"];
}

const TILE_COLORS: Record<TileType, string> = {
  start: "#C0392B",
  finish: "#C0392B",
  property: "#315DA8",
  chance: "#EACC39",
  lottery: "#CC713D",
  shortcut: "#65904F",
  detour: "#65904F",
  bus: "#65904F",
  hospital: "#65904F",
  repairShop: "#65904F",
};

const TILE_WIDTH = 96;
const TILE_HEIGHT = 48;

const STEP_X = 120;
const STEP_Y = 100;

function position(tile: Tile) {
  return {
    x: tile.x * STEP_X + 65,
    y: tile.y * STEP_Y + 45,
  };
}

// Calculate an arrow that stops at the edges
// of the squares instead of their centers.
function arrowPosition(from: Tile, to: Tile) {
  const a = position(from);
  const b = position(to);

  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const scale = Math.min(
    (TILE_WIDTH / 2) / Math.abs(dx),
    (TILE_HEIGHT / 2) / Math.abs(dy)
  );

  return {
    x1: a.x + dx * scale,
    y1: a.y + dy * scale,
    x2: b.x - dx * scale,
    y2: b.y - dy * scale,
  };
}

function getLabelLines(name: string): string[] {
  const labels: Record<string, string[]> = {
    Elektronikbutik: ["Elektronik", "butik"],
    Hamburgerrestaurang: ["Hamburger", "restaurang"],
    Chokladfabrik: ["Choklad", "fabrik"],
    Möbelbutik: ["Möbelbutik"],
    "Svensk Bank": ["Svensk Bank"],
    Bilverkstad: ["Bilverkstad"],
  };

  return labels[name] ?? [name];
}

export default function GameBoard({
  tiles,
  players,
  ownership,
}: GameBoardProps) {
  const [zoom, setZoom] = useState(1);

  const tileMap = new Map(
    tiles.map((tile) => [tile.id, tile])
  );

  const boardWidth =
    (Math.max(...tiles.map((t) => t.x)) + 1) *
      STEP_X +
    20;

  const boardHeight =
    Math.max(...tiles.map((t) => t.y)) * STEP_Y +
    90;

  return (
    <section className="board-section">
      <div className="board-toolbar">
        <h2>Spelplan</h2>

        <div className="zoom-controls">
          <button
            onClick={() =>
              setZoom((z) => Math.max(0.5, z - 0.25))
            }
            disabled={zoom <= 0.5}
          >
            −
          </button>

          <span>{Math.round(zoom * 100)}%</span>

          <button
            onClick={() =>
              setZoom((z) => Math.min(2, z + 0.25))
            }
            disabled={zoom >= 2}
          >
            +
          </button>
        </div>
      </div>

      <div className="board-scroll">
        <svg
          className="game-board"
          width={boardWidth * zoom}
          height={boardHeight * zoom}
          viewBox={
            "0 0 " + boardWidth + " " + boardHeight
          }
          aria-label="Gubbspelets spelplan"
        >
          <defs>
            <marker
              id="board-arrow"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path
                d="M0 0 L6 3 L0 6 Z"
                fill="#414B3F"
              />
            </marker>

            <marker
              id="special-arrow"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path
                d="M0 0 L6 3 L0 6 Z"
                fill="#65904F"
              />
            </marker>
          </defs>

          {/* Normal movement arrows */}
          {tiles.map((tile) => {
            if (!tile.nextTileId) return null;

            const next = tileMap.get(tile.nextTileId);

            if (!next) return null;

            return (
              <line
                key={"arrow-" + tile.id}
                {...arrowPosition(tile, next)}
                stroke="#414B3F"
                strokeWidth="2"
                markerEnd="url(#board-arrow)"
              />
            );
          })}

          {/* Alternative route arrows */}
          {tiles.map((tile) => {
            if (
              tile.type !== "shortcut" &&
              tile.type !== "detour"
            ) {
              return null;
            }

            if (!tile.targetTileId) return null;

            const target = tileMap.get(tile.targetTileId);

            if (!target) return null;

            return (
              <line
                key={"special-" + tile.id}
                {...arrowPosition(tile, target)}
                stroke="#65904F"
                strokeWidth="3"
                markerEnd="url(#special-arrow)"
              />
            );
          })}

          {/* Render all board squares */}
          {tiles.map((tile) => {
            const { x, y } = position(tile);
            const lines = getLabelLines(tile.name);

            const playersHere = players.filter(
              (player) => player.tileId === tile.id
            );

            const textColor =
              tile.type === "chance"
                ? "#222222"
                : "#FFFFFF";


            const hasPlayers = playersHere.length > 0;

            const ownerId = tile.propertyId
            ? ownership[tile.propertyId]
            : undefined;

            const owner = players.find(
            (player) => player.id === ownerId
            );


            return (
              <g key={tile.id}>
                <rect
                  x={x - TILE_WIDTH / 2}
                  y={y - TILE_HEIGHT / 2}
                  width={TILE_WIDTH}
                  height={TILE_HEIGHT}
                  rx={6}
                  fill={TILE_COLORS[tile.type]}
                  stroke="#000000"
                  strokeOpacity="0.2"
                  strokeWidth="1.5"
                />

                {owner && (
                <rect
                    x={x - TILE_WIDTH / 2 + 2}
                    y={y - TILE_HEIGHT / 2 + 2}
                    width={TILE_WIDTH - 4}
                    height={6}
                    rx={2}
                    fill={owner.color}
                />
                )}

                <text
                  x={x}
                  y={y - (hasPlayers ? 8 : 0)}
                  fill={textColor}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontWeight="bold"
                  fontSize={
                    tile.type === "chance" ? 25 : 11
                  }
                >
                  {lines.map((line, index) => (
                    <tspan
                      key={index}
                      x={x}
                      dy={
                        index === 0
                          ? lines.length > 1
                            ? -6
                            : 0
                          : 12
                      }
                    >
                      {line}
                    </tspan>
                  ))}
                </text>

                {/* Player pieces on this square */}
                {playersHere.map((player, index) => (
                  <circle
                    key={player.id}
                    cx={
                      x +
                      (index -
                        (playersHere.length - 1) / 2) *
                        17
                    }
                    cy={y + 14}
                    r={7}
                    fill={player.color}
                    stroke="white"
                    strokeWidth="2"
                  >
                    <title>{player.name}</title>
                  </circle>
                ))}

                <title>
                {owner
                    ? tile.name + " – Ägare: " + owner.name
                    : tile.name}
                </title>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="board-legend">
        <span><i className="legend-property" />Aktiebrev</span>
        <span><i className="legend-chance" />Frågekort</span>
        <span><i className="legend-lottery" />Lotteri</span>
        <span><i className="legend-special" />Specialruta</span>
      </div>
    </section>
  );
}
