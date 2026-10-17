import { Badge } from "@/components/ui/badge";

const AdvancedSettingsSidebar = () => {
  return (
    <div className="flex flex-col gap-4">
      <Badge variant="neutral">Global defaults</Badge>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Commission, spread, slippage, and overnight financing apply to every Strategy Explorer and Walk Forward
        Engine run — set once here, no per-run overrides.
      </p>
    </div>
  );
};

export default AdvancedSettingsSidebar;
