import { DirectionProvider } from "@/components/ui/direction";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Preview() {
  return (
    <DirectionProvider dir="rtl">
      <div dir="rtl" className="grid gap-3">
        <p className="text-body text-fg">صندوق البريد</p>
        <Tabs defaultValue="mailboxes">
          <TabsList>
            <TabsTrigger value="mailboxes">صناديق البريد</TabsTrigger>
            <TabsTrigger value="rules">قواعد الاتصال</TabsTrigger>
            <TabsTrigger value="domains">النطاقات</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </DirectionProvider>
  );
}
