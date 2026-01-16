import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/lib/use-currency";
import type { CurrencyCode } from "@bhvr-ecom/currency/client";

export function CurrencySelector() {
  const { currency, setCurrency, currencies } = useCurrency();

  return (
    <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyCode)}>
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(currencies).map(([code, info]) => (
          <SelectItem key={code} value={code}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{info.symbol}</span>
              <span className="text-sm">{code}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
