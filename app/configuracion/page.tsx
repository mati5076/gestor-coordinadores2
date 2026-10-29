import { Topbar } from "@/components/ui";
import AlertSettingsForm from "@/components/AlertSettingsForm";
import { getAlertSettings } from "@/lib/alert-email";
import { isSmtpConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const settings = await getAlertSettings();
  return (
    <>
      <Topbar title="Configuración" subtitle="Preferencias de notificación de alertas." />
      <div className="content">
        <AlertSettingsForm
          initialEnabled={settings?.emailEnabled ?? false}
          initialEmail={settings?.coordinatorEmail ?? ""}
          smtpOk={isSmtpConfigured()}
        />
      </div>
    </>
  );
}
