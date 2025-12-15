import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantEmailPreferences } from "@/components/settings/TenantEmailPreferences";
import { TenantTemplateEditor } from "@/components/settings/TenantTemplateEditor";

export function EmailSettingsSection() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">Email & Notifications</h2>
                <p className="text-sm text-muted-foreground">Manage organization-wide email settings and templates.</p>
            </div>

            <Tabs defaultValue="preferences" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="preferences">
                    <TenantEmailPreferences />
                </TabsContent>

                <TabsContent value="templates">
                    <TenantTemplateEditor />
                </TabsContent>
            </Tabs>
        </div>
    );
}
