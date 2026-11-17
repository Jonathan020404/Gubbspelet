import { useState } from "react";
import type { PropertyId } from "../types";

type PropertyInfoProps = {
  propertyId: PropertyId;
  name: string;
  price: number;
  fee: number;
  ownedByMe: boolean;
  canSell: boolean;
  onSell: (propertyId: PropertyId) => void;
};

export default function PropertyInfo({
  propertyId,
  name,
  price,
  fee,
  ownedByMe,
  canSell,
  onSell,
}: PropertyInfoProps) {
  const [open, setOpen] = useState(false);

  const sellPrice = Math.floor(price * 0.5);

  const money = (amount: number) => amount.toLocaleString("sv-SE") + " kr";

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        title={`${name} | Köppris: ${money(price)} | Hyra: ${money(fee)} | Säljpris: ${money(sellPrice)}`}
        style={{
          cursor: "pointer",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #888",
          background: "transparent",
          color: "inherit",
        }}
      >
        {name} ⓘ
      </button>

      {open && (
        <div
          style={{
            marginTop: 8,
            padding: 14,
            border: "1px solid #888",
            borderRadius: 10,
          }}
        >
          <h3>{name}</h3>

          <p>Köppris: {money(price)}</p>
          <p>Hyra: {money(fee)}</p>
          <p>Säljpris: {money(sellPrice)}</p>

          {ownedByMe && (
            <button
              type="button"
              disabled={!canSell}
              onClick={() => {
                onSell(propertyId);
                setOpen(false);
              }}
            >
              Sälj till Banken
            </button>
          )}

          {ownedByMe && !canSell && (
            <p>Du kan endast sälja innan du slår tärningen på din egen tur.</p>
          )}
        </div>
      )}
    </div>
  );
}
