import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, LogOut, Trophy, Target, Flame, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AchievementsGrid } from "@/components/achievements/AchievementsGrid";
import { ChampionPicker } from "@/components/fixture/ChampionPicker";
import foto8 from "@/assets/foto8.jpg";
import { Lightbox } from "@/components/ui/Lightbox";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
  head: () => ({
    meta: [{ title: "Mi perfil · Dale Dale" }],
  }),
});

function PerfilPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user || !profile) return null;

  const initials = profile.display_name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const handleAvatar = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: profErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (profErr) throw profErr;
      await refreshProfile();
      toast.success("Avatar actualizado");
    } catch (err) {
      toast.error("No se pudo subir el avatar", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", user.id);
    if (error) { toast.error("No se pudo guardar"); }
    else { await refreshProfile(); toast.success("Perfil actualizado"); }
    setSaving(false);
  };

  const stats = [
    {
      icon: Trophy,
      label: "Puntos totales",
      value: profile.total_points,
      gradient: "from-yellow-400/20 to-orange-400/10",
      border: "border-yellow-400/30",
      iconColor: "text-yellow-400",
      valueColor: "text-yellow-400",
      glow: "shadow-[0_0_20px_rgba(250,204,21,0.15)]",
    },
    {
      icon: Target,
      label: "Exactos",
      value: profile.exact_hits,
      gradient: "from-primary/20 to-cyan-400/10",
      border: "border-primary/30",
      iconColor: "text-primary",
      valueColor: "text-primary",
      glow: "shadow-[0_0_20px_rgba(99,102,241,0.15)]",
    },
    {
      icon: Flame,
      label: "Racha actual",
      value: profile.current_streak,
      gradient: "from-secondary/20 to-emerald-400/10",
      border: "border-secondary/30",
      iconColor: "text-secondary",
      valueColor: "text-secondary",
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">

      {/* Card principal */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden shadow-glow ring-2 ring-primary/30">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                : <span className="font-display font-bold text-3xl text-background">{initials}</span>
              }
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute inset-0 rounded-2xl bg-background/70 backdrop-blur opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])} />
            <p className="text-center text-[10px] font-mono text-muted-foreground mt-1.5 opacity-0 group-hover:opacity-100 transition">
              Cambiar foto
            </p>
          </div>

          <div className="flex-1 w-full min-w-0">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Tu perfil</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl mt-1 truncate">{profile.display_name}</h1>
            <p className="text-sm text-muted-foreground mt-1 truncate">{user.email}</p>
          </div>

          <button onClick={async () => { await signOut(); toast.success("Sesión cerrada"); }}
            className="inline-flex items-center gap-2 glass rounded-xl px-4 py-2 text-sm font-medium hover:bg-destructive/20 hover:text-destructive transition flex-shrink-0">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>

        {/* Stats mejoradas */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 + i * 0.07 }}
              className={`relative rounded-2xl p-4 sm:p-6 text-center border bg-gradient-to-br ${s.gradient} ${s.border} ${s.glow} overflow-hidden`}
            >
              {/* Glow blob */}
              <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-40 bg-gradient-to-br ${s.gradient}`} />
              <div className="relative">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${s.gradient} border ${s.border} flex items-center justify-center mx-auto mb-3`}>
                  <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.iconColor}`} />
                </div>
                <div className={`font-display font-black text-3xl sm:text-4xl ${s.valueColor} tabular-nums`}>
                  {s.value}
                </div>
                <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5 font-mono">
                  {s.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Campeón */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-6">
        <ChampionPicker />
      </motion.div>

      {/* Datos + foto8 */}
      <div className="flex gap-4 items-start mt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex-1 glass-strong rounded-3xl p-6 sm:p-8">
          <h2 className="font-display font-semibold text-lg mb-4">Datos del perfil</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Nombre a mostrar</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition" />
            </div>
            <button onClick={handleSave} disabled={saving || name.trim() === profile.display_name}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-2.5 px-5 font-semibold text-background shadow-glow hover:scale-[1.01] transition disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar cambios
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="hidden sm:block w-36 flex-shrink-0 self-center">
          <Lightbox
            src={foto8}
            className="rounded-2xl overflow-hidden border-2 border-primary/30 shadow-glow rotate-2 hover:rotate-0 transition-transform duration-300"
            imgClassName="w-full h-auto"
          />
        </motion.div>
      </div>

      {/* Logros */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-strong rounded-3xl p-6 sm:p-8 mt-6 mb-6">
        <AchievementsGrid userId={user.id} />
      </motion.div>
    </div>
  );
}
