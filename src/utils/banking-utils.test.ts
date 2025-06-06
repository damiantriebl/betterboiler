import type { BankCard } from "@/types/bank-cards";
import { beforeEach, describe, expect, it } from "vitest";
import {
  extractBankAndCardFromBankCardId,
  findBankCardById,
  findBankCardId,
  groupBankCardsByBank,
} from "./banking-utils";

let bankCards: BankCard[];

beforeEach(() => {
  bankCards = [
    {
      id: 1,
      bankId: 10,
      cardTypeId: 1,
      organizationId: "org1",
      isEnabled: true,
      order: 1,
      bank: { id: 10, name: "Bank A", logoUrl: "logo-a" },
      cardType: { id: 1, name: "Visa", type: "credit", logoUrl: "visa.png" },
    },
    {
      id: 2,
      bankId: 10,
      cardTypeId: 2,
      organizationId: "org1",
      isEnabled: false,
      order: 2,
      bank: { id: 10, name: "Bank A", logoUrl: "logo-a" },
      cardType: { id: 2, name: "Master", type: "debit", logoUrl: "master.png" },
    },
    {
      id: 3,
      bankId: 20,
      cardTypeId: 1,
      organizationId: "org1",
      isEnabled: true,
      order: 1,
      bank: { id: 20, name: "Bank B", logoUrl: "logo-b" },
      cardType: { id: 1, name: "Visa", type: "credit", logoUrl: "visa.png" },
    },
  ];
});

describe("groupBankCardsByBank", () => {
  it("groups cards by bank and sorts alphabetically", () => {
    const grouped = groupBankCardsByBank(bankCards);
    expect(grouped).toHaveLength(2);
    // Should be sorted alphabetically by bank name
    expect(grouped[0].bank.name).toBe("Bank A");
    expect(grouped[0].cards).toHaveLength(2);
    expect(grouped[1].bank.name).toBe("Bank B");
    expect(grouped[1].cards[0].id).toBe(3);
  });
});

describe("findBankCardById", () => {
  it("returns the card when found", () => {
    expect(findBankCardById(bankCards, 2)?.bankId).toBe(10);
  });

  it("returns null when id is not found or falsy", () => {
    expect(findBankCardById(bankCards, 999)).toBeNull();
    expect(findBankCardById(bankCards, undefined)).toBeNull();
  });
});

describe("extractBankAndCardFromBankCardId", () => {
  it("extracts ids when card exists", () => {
    const res = extractBankAndCardFromBankCardId(bankCards, "3");
    expect(res).toEqual({ bankId: 20, cardId: 3 });
  });

  it('returns nulls when id is invalid or "all"', () => {
    expect(extractBankAndCardFromBankCardId(bankCards, "all")).toEqual({
      bankId: null,
      cardId: null,
    });
    expect(extractBankAndCardFromBankCardId(bankCards, 999)).toEqual({
      bankId: null,
      cardId: null,
    });
  });
});

describe("findBankCardId", () => {
  it("returns the bankCardId when cardId provided", () => {
    expect(findBankCardId(bankCards, 10, 1)).toBe(1);
  });

  it("returns null when only bankId provided or invalid", () => {
    expect(findBankCardId(bankCards, 10, null)).toBeNull();
    expect(findBankCardId(bankCards, null, null)).toBeNull();
  });
});
