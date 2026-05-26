import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Pin, Trash2, Loader2, MessageCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/landing/Navbar";
import foto10 from "@/assets/foto10.jpg";
import { Lightbox } from "@/components/ui/Lightbox";
 
export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "Chat · Dale Dale" },
      { name: "description", content: "El chat del grupo. Bardeo, predicciones y drama." },
    ],
  }),
});
 
const EMOJIS = ["👍", "❤️", "😂", "🔥", "😮"] as const;
const MAX_CHARS = 500;
 
type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};
 
type Reaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};
 
type Message = {
  id: string;
  user_id: string;
  content: string;
  pinned: boolean;
  created_at: string;
  profile?: Profile;
  reactions?: Reaction[];
};
 
function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}
 
function Avatar({ profile, size = "sm" }: { profile?: Profile; size?: "sm" | "md" }) {
  const initials = profile?.display_name?.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const cls = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        : <span className="font-bold text-background">{initials}</span>
      }
    </div>
  );
}
 
function ChatPage() {
  const { user, profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
 
  // Fetch messages + profiles + reactions
  const messagesQ = useQuery({
    queryKey: ["chat-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id, user_id, content, pinned, created_at,
          profile:profiles(id, display_name, avatar_url),
          reactions:message_reactions(id, message_id, user_id, emoji)
        `)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Message[];
    },
    enabled: !!user,
  });
 
  // Realtime subscription
  useEffect(() => {
    if (!user) return;
 
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["chat-messages"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        qc.invalidateQueries({ queryKey: ["chat-messages"] });
      })
      .subscribe();
 
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);
 
  // Auto scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQ.data?.length]);
 
  const sendMut = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase
        .from("messages")
        .insert({ user_id: user.id, content: content.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setInput("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: (e: Error) => toast.error(e.message),
  });
 
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-messages"] }),
    onError: (e: Error) => toast.error(e.message),
  });
 
  const pinMut = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from("messages").update({ pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-messages"] }),
    onError: (e: Error) => toast.error(e.message),
  });
 
  const reactionMut = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) return;
      const existing = messagesQ.data
        ?.find((m) => m.id === messageId)
        ?.reactions?.find((r) => r.user_id === user.id && r.emoji === emoji);
      if (existing) {
        await supabase.from("message_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-messages"] });
      setShowEmojiPicker(null);
    },
  });
 
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length > MAX_CHARS) return;
    sendMut.mutate(trimmed);
  };
 
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
 
  const messages = messagesQ.data ?? [];
  const pinnedMessages = messages.filter((m) => m.pinned);
 
  // Agrupar mensajes consecutivos del mismo usuario
  const grouped = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1];
      const isOwn = msg.user_id === user?.id;
      const isSameUser = prev?.user_id === msg.user_id;
      const isClose = prev
        ? new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 3 * 60 * 1000
        : false;
      return { ...msg, isOwn, showHeader: !isSameUser || !isClose };
    });
  }, [messages, user?.id]);
 
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="glass-strong rounded-2xl p-10 max-w-sm w-full text-center">
            <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="font-display font-bold text-2xl mb-2">Chat del grupo</h2>
            <p className="text-muted-foreground text-sm mb-6">Tenés que estar logueado para ver y participar en el chat.</p>
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3 font-semibold text-background shadow-glow hover:scale-[1.02] transition">
              <LogIn className="w-4 h-4" /> Ingresar
            </Link>
          </div>
        </div>
      </div>
    );
  }
 
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
 
      <div className="flex-1 flex flex-col mx-auto w-full max-w-3xl px-4 sm:px-6 pt-24 pb-0">
        {/* Header */}
        <div className="py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">Chat del grupo</h1>
              <p className="text-xs text-muted-foreground">
                {messages.length} mensajes · Solo para participantes
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 glass rounded-xl px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-xs font-mono text-muted-foreground">LIVE</span>
            </div>
          </div>
        </div>
 
        {/* Mensajes pineados */}
        {pinnedMessages.length > 0 && (
          <div className="py-2 space-y-1">
            {pinnedMessages.map((m) => (
              <div key={m.id} className="flex items-center gap-2 glass rounded-lg px-3 py-2 text-xs text-muted-foreground">
                <Pin className="w-3 h-3 text-gold flex-shrink-0" />
                <span className="font-semibold text-foreground truncate">{m.profile?.display_name}:</span>
                <span className="truncate">{m.content}</span>
                {isAdmin && (
                  <button onClick={() => pinMut.mutate({ id: m.id, pinned: false })} className="ml-auto text-muted-foreground hover:text-foreground">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
 
        {/* Lista de mensajes */}
        <div className="flex-1 overflow-y-auto py-4 space-y-1" style={{ minHeight: 0 }}>
          {messagesQ.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <MessageCircle className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Nadie dijo nada todavía. ¡Rompé el hielo!</p>
            </div>
          ) : (
            grouped.map((msg) => {
              const reactionGroups = EMOJIS.map((emoji) => {
                const users = msg.reactions?.filter((r) => r.emoji === emoji) ?? [];
                const iMine = users.some((r) => r.user_id === user?.id);
                return { emoji, count: users.length, iMine };
              }).filter((r) => r.count > 0);
 
              return (
                <div
                  key={msg.id}
                  className={`group flex gap-2.5 ${msg.isOwn ? "flex-row-reverse" : "flex-row"} ${msg.showHeader ? "mt-4" : "mt-0.5"}`}
                >
                  {/* Avatar */}
                  {msg.showHeader ? (
                    <Avatar profile={msg.profile as Profile} />
                  ) : (
                    <div className="w-8 flex-shrink-0" />
                  )}
 
                  <div className={`flex flex-col max-w-[75%] ${msg.isOwn ? "items-end" : "items-start"}`}>
                    {/* Nombre + hora */}
                    {msg.showHeader && (
                      <div className={`flex items-baseline gap-2 mb-1 ${msg.isOwn ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="text-xs font-semibold truncate max-w-[120px]">
                          {msg.isOwn ? "Vos" : msg.profile?.display_name ?? "—"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                      </div>
                    )}
 
                    {/* Burbuja */}
                    <div className="relative">
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          msg.isOwn
                            ? "bg-gradient-to-br from-primary to-secondary text-background rounded-tr-sm"
                            : "glass rounded-tl-sm"
                        } ${msg.pinned ? "ring-1 ring-gold/50" : ""}`}
                      >
                        {msg.pinned && <Pin className="w-3 h-3 text-gold inline mr-1" />}
                        {msg.content}
                      </div>
 
                      {/* Acciones hover */}
                      <div className={`absolute top-0 ${msg.isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} opacity-0 group-hover:opacity-100 transition flex items-center gap-1`}>
                        <button
                          onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                          className="w-7 h-7 glass rounded-lg flex items-center justify-center text-xs hover:bg-card transition"
                          title="Reaccionar"
                        >
                          😊
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => pinMut.mutate({ id: msg.id, pinned: !msg.pinned })}
                              className="w-7 h-7 glass rounded-lg flex items-center justify-center hover:bg-card transition"
                              title={msg.pinned ? "Despinear" : "Pinear"}
                            >
                              <Pin className="w-3.5 h-3.5 text-gold" />
                            </button>
                          </>
                        )}
                        {(isAdmin || msg.user_id === user?.id) && (
                          <button
                            onClick={() => {
                              if (confirm("¿Borrar este mensaje?")) deleteMut.mutate(msg.id);
                            }}
                            className="w-7 h-7 glass rounded-lg flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition"
                            title="Borrar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
 
                      {/* Emoji picker */}
                      {showEmojiPicker === msg.id && (
                        <div className={`absolute top-8 z-20 glass-strong rounded-xl p-1.5 flex gap-1 shadow-glow ${msg.isOwn ? "right-0" : "left-0"}`}>
                          {EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => reactionMut.mutate({ messageId: msg.id, emoji })}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-card transition text-base active:scale-90"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
 
                    {/* Reacciones */}
                    {reactionGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {reactionGroups.map(({ emoji, count, iMine }) => (
                          <button
                            key={emoji}
                            onClick={() => reactionMut.mutate({ messageId: msg.id, emoji })}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition ${
                              iMine
                                ? "bg-primary/20 ring-1 ring-primary/40 text-primary"
                                : "glass hover:bg-card"
                            }`}
                          >
                            {emoji} <span className="font-mono">{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
 
        {/* Input */}
        <div className="py-4 border-t border-border/50">
          <div className="flex gap-3 items-end">
            <Avatar profile={profile as Profile | undefined} />
            <div className="flex-1 glass rounded-2xl px-4 py-3 flex flex-col gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Escribí algo... (Enter para enviar)"
                rows={1}
                maxLength={MAX_CHARS}
                className="w-full bg-transparent resize-none text-sm focus:outline-none placeholder:text-muted-foreground/60 max-h-32"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
              {input.length > 400 && (
                <div className="text-[10px] text-right font-mono text-muted-foreground">
                  {input.length}/{MAX_CHARS}
                </div>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || input.length > MAX_CHARS || sendMut.isPending}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.05] active:scale-95 transition flex-shrink-0"
            >
              {sendMut.isPending
                ? <Loader2 className="w-4 h-4 animate-spin text-background" />
                : <Send className="w-4 h-4 text-background" />
              }
            </button>
          </div>
        </div>
      </div>
 
      {/* Click outside emoji picker */}
      {showEmojiPicker && (
        <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(null)} />
      )}
    </div>
  );
}
