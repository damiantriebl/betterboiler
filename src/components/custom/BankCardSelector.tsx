"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { BankWithCards } from "@/types/bank-cards";
import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";

interface BankCardSelectorProps {
  banksWithCards: BankWithCards[];
  selectedBankId?: number | null;
  selectedCardId?: number | null;
  onSelectBank: (bankId: number | null) => void;
  onSelectCard: (cardId: number | null, bankId: number | null) => void;
  className?: string;
  bankPlaceholder?: string;
  cardPlaceholder?: string;
  bankSearchPlaceholder?: string;
  cardSearchPlaceholder?: string;
  bankNotFoundMessage?: string;
  cardNotFoundMessage?: string;
  allowAllBanks?: boolean;
  allowAllCards?: boolean;
  disabled?: boolean;
}

export function BankCardSelector({
  banksWithCards,
  selectedBankId,
  selectedCardId,
  onSelectBank,
  onSelectCard,
  className,
  bankPlaceholder = "Selecciona un banco...",
  cardPlaceholder = "Selecciona una tarjeta...",
  bankSearchPlaceholder = "Buscar banco...",
  cardSearchPlaceholder = "Buscar tarjeta...",
  bankNotFoundMessage = "No se encontró ningún banco.",
  cardNotFoundMessage = "No se encontró ninguna tarjeta.",
  allowAllBanks = true,
  allowAllCards = true,
  disabled = false,
}: BankCardSelectorProps) {
  const [bankPopoverOpen, setBankPopoverOpen] = React.useState(false);
  const [cardPopoverOpen, setCardPopoverOpen] = React.useState(false);

  // Find selected bank from the list
  const selectedBank = () => {
    if (!selectedBankId) return null;
    return banksWithCards.find((bank) => bank.bank.id === selectedBankId) || null;
  };

  // Find selected card from the selected bank
  const selectedCard = () => {
    const bank = selectedBank();
    if (!selectedCardId || !bank) return null;
    return bank.cards.find((card) => card.id === selectedCardId) || null;
  };

  // Get available cards for the selected bank
  const availableCards = () => {
    const bank = selectedBank();
    if (!bank) return [];
    return bank.cards.filter((card) => card.isEnabled);
  };

  // Handle selecting all banks
  const handleSelectAllBanks = () => {
    onSelectBank(null);
    onSelectCard(null, null);
  };

  // Handle selecting all cards for the selected bank
  const handleSelectAllCards = () => {
    if (selectedBank()) {
      onSelectCard(null, selectedBank()?.bank.id || null);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Bank Selector */}
      <Popover open={bankPopoverOpen} onOpenChange={setBankPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={bankPopoverOpen}
            className="w-full justify-between h-10"
            disabled={disabled}
          >
            {selectedBank() ? selectedBank()?.bank.name : bankPlaceholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={true}>
            <CommandInput placeholder={bankSearchPlaceholder} />
            <CommandList>
              <CommandEmpty>{bankNotFoundMessage}</CommandEmpty>
              {allowAllBanks && (
                <CommandItem
                  value="all_banks"
                  onSelect={handleSelectAllBanks}
                  className="py-1.5 px-2"
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", !selectedBankId ? "opacity-100" : "opacity-0")}
                  />
                  Todos los bancos
                </CommandItem>
              )}
              <CommandGroup>
                {banksWithCards.map((bankWithCards) => (
                  <CommandItem
                    key={bankWithCards.bank.id}
                    value={bankWithCards.bank.name}
                    onSelect={() => {
                      onSelectBank(bankWithCards.bank.id);
                      setBankPopoverOpen(false);
                    }}
                    className="py-1.5 px-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedBankId === bankWithCards.bank.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex items-center gap-2">
                      {bankWithCards.bank.logoUrl && (
                        <img
                          src={bankWithCards.bank.logoUrl}
                          alt={bankWithCards.bank.name}
                          className="w-5 h-5 object-contain"
                        />
                      )}
                      {bankWithCards.bank.name}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Card Selector - Only enabled when a bank is selected */}
      <Popover open={cardPopoverOpen} onOpenChange={setCardPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={cardPopoverOpen}
            className="w-full justify-between h-10"
            disabled={!selectedBank() || disabled}
          >
            {selectedCard() ? selectedCard()?.cardType.name : cardPlaceholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={true}>
            <CommandInput placeholder={cardSearchPlaceholder} />
            <CommandList>
              <CommandEmpty>{cardNotFoundMessage}</CommandEmpty>
              {allowAllCards && selectedBank() && (
                <CommandItem
                  value="all_cards"
                  onSelect={handleSelectAllCards}
                  className="py-1.5 px-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !selectedCardId && selectedBankId ? "opacity-100" : "opacity-0",
                    )}
                  />
                  Todas las tarjetas de {selectedBank()?.bank.name}
                </CommandItem>
              )}
              <CommandGroup>
                {availableCards().map((card) => (
                  <CommandItem
                    key={card.id}
                    value={card.cardType.name}
                    onSelect={() => {
                      onSelectCard(card.id, selectedBankId || null);
                      setCardPopoverOpen(false);
                    }}
                    className="py-1.5 px-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCardId === card.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex items-center gap-2">
                      {card.cardType.logoUrl && (
                        <img
                          src={card.cardType.logoUrl}
                          alt={card.cardType.name}
                          className="w-5 h-5 object-contain"
                        />
                      )}
                      {card.cardType.name}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
