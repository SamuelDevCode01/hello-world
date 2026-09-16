import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstalarApp() {
  const [evento, setEvento] = useState<InstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setInstalado(standalone);
    const antes = (e: Event) => {
      e.preventDefault();
      setEvento(e as InstallPromptEvent);
    };
    const depois = () => {
      setEvento(null);
      setInstalado(true);
    };
    window.addEventListener("beforeinstallprompt", antes);
    window.addEventListener("appinstalled", depois);
    return () => {
      window.removeEventListener("beforeinstallprompt", antes);
      window.removeEventListener("appinstalled", depois);
    };
  }, []);

  if (instalado) return <p className="text-xs text-muted-foreground">Aplicativo instalado neste dispositivo.</p>;

  if (!evento) {
    return <p className="text-xs text-muted-foreground">No celular, use o menu do navegador e escolha “Adicionar à tela inicial” quando a instalação automática não aparecer.</p>;
  }

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const escolha = await evento.userChoice;
    if (escolha.outcome === "accepted") setEvento(null);
  }

  return <Button variant="outline" className="h-11 rounded-xl" onClick={() => void instalar()}><Download className="size-4"/> Instalar aplicativo</Button>;
}
