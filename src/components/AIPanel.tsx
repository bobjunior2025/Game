/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, RefreshCw, Zap, Trophy, BookOpen } from "lucide-react";
import { Game } from "../data/games";

interface Message {
  role: "user" | "model";
  text: string;
}

interface AIPanelProps {
  activeGame: Game | null;
  soundEnabled: boolean;
  playBeep: () => void;
}

export default function AIPanel({
  activeGame,
  soundEnabled,
  playBeep,
}: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when game changes or on mount
  useEffect(() => {
    if (activeGame) {
      setMessages([
        {
          role: "model",
          text: `Olá! Eu sou o seu **Gemini Co-Pilot**. Percebi que você selecionou **${activeGame.title}** (${activeGame.system.toUpperCase()})! 🎮\n\nPosso te ajudar com:\n- **Walkthroughs & Guias**: "Como passo da primeira fase?"\n- **Segredos & Cheats**: "Me dê códigos GameShark de vidas infinitas"\n- **Lore & Curiosidades**: "Quem compôs a trilha sonora?" ou "Qual a história desse jogo?"\n\nO que gostaria de saber sobre este clássico hoje?`,
        },
      ]);
    } else {
      setMessages([
        {
          role: "model",
          text: "Olá! Eu sou o seu **Gemini Co-Pilot Retro**. 🚀\n\nPosso te contar histórias incríveis dos bastidores de desenvolvimento dos jogos de N64 e PS1, sugerir cheats lendários, dar dicas estratégicas ou te recomendar o jogo perfeito com base no seu humor hoje!\n\nPergunte-me qualquer coisa sobre os clássicos do catálogo!",
        },
      ]);
    }
  }, [activeGame]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    if (soundEnabled) playBeep();

    if (!customText) {
      setInput("");
    }
    
    setMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setLoading(true);

    try {
      const context = activeGame
        ? {
            title: activeGame.title,
            system: activeGame.system,
            genre: activeGame.genre,
            year: activeGame.year,
            rating: activeGame.rating,
            description: activeGame.description,
            synopsis: activeGame.synopsis,
            controls: activeGame.controls,
          }
        : null;

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToSend, context }),
      });

      const data = await response.json();

      if (response.ok && data.text) {
        setMessages((prev) => [...prev, { role: "model", text: data.text }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: `⚠️ Erro: ${data.error || "Não foi possível obter uma resposta do Gemini AI."}`,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "❌ Ocorreu um erro de conexão. Verifique suas configurações de internet e se o servidor backend está ativo.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const parseMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Bold **bold**
      return (
        <p key={idx} className="mb-2 leading-relaxed text-sm text-gray-300">
          {line.split("**").map((part, i) => {
            if (i % 2 === 1) {
              return <strong key={i} className="text-red-400 font-bold">{part}</strong>;
            }
            return part.split("`").map((subPart, j) => {
              if (j % 2 === 1) {
                return (
                  <code key={j} className="bg-zinc-800 px-1.5 py-0.5 rounded text-yellow-400 font-mono text-xs border border-zinc-700">
                    {subPart}
                  </code>
                );
              }
              return subPart;
            });
          })}
        </p>
      );
    });
  };

  return (
    <div id="ai-panel" className="bg-zinc-950/90 backdrop-blur-md rounded-2xl border border-zinc-800 overflow-hidden flex flex-col h-full shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg">
            <Bot className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-100 flex items-center gap-1">
              Gemini Retro Co-Pilot
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            </h3>
            <p className="text-[10px] text-zinc-400">
              {activeGame ? `Assistente para ${activeGame.title}` : "Crítico & Consultor de Games"}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (soundEnabled) playBeep();
            setMessages([
              {
                role: "model",
                text: "Memória do chat reiniciada. Qual segredo dos consoles clássicos você gostaria de desvendar agora?",
              },
            ]);
          }}
          title="Limpar Chat"
          className="text-zinc-500 hover:text-red-500 p-1.5 rounded-lg hover:bg-zinc-800 transition-all border border-transparent"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[180px] max-h-[380px] scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "model" && (
              <div className="w-7 h-7 rounded-full bg-red-950 flex items-center justify-center border border-red-900/30 shrink-0 shadow-md">
                <Bot className="w-3.5 h-3.5 text-red-500" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md transition-all duration-300 ${
                msg.role === "user"
                  ? "bg-red-600 text-white rounded-tr-none border border-red-500/25"
                  : "bg-zinc-900 text-gray-200 rounded-tl-none border border-zinc-800"
              }`}
            >
              {parseMarkdown(msg.text)}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shrink-0 shadow-md">
                <User className="w-3.5 h-3.5 text-zinc-300" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-red-950 flex items-center justify-center border border-red-900/30 shrink-0 animate-pulse">
              <Bot className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className="bg-zinc-900 text-gray-300 rounded-2xl rounded-tl-none px-4 py-3 text-sm border border-zinc-800 flex items-center gap-2 shadow-md">
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
              <span className="text-xs text-zinc-400 animate-pulse">Pensando no jogo...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion prompts helpers */}
      {activeGame && (
        <div className="px-3 py-2 border-t border-zinc-900 flex flex-wrap gap-1 bg-zinc-950/40">
          <button
            onClick={() => handleSend(`Me conte a história e curiosidades sobre o desenvolvimento de ${activeGame.title}`)}
            className="text-3xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-3 h-3 text-red-500" /> Curiosidades & Lore
          </button>
          <button
            onClick={() => handleSend(`Me mostre códigos GameShark, cheats e segredos para ${activeGame.title}`)}
            className="text-3xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
          >
            <Zap className="w-3 h-3 text-yellow-500 animate-bounce" /> Trapaças / Cheats
          </button>
          <button
            onClick={() => handleSend(`Me dê dicas estratégicas de gameplay ou walkthrough para passar de fase em ${activeGame.title}`)}
            className="text-3xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
          >
            <Trophy className="w-3 h-3 text-amber-500" /> Dicas de Gameplay
          </button>
        </div>
      )}

      {/* Chat Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="p-3 bg-zinc-950 border-t border-zinc-800 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={activeGame ? `Pergunte sobre ${activeGame.title}...` : "Pergunte sobre qualquer jogo ou peça recomendações..."}
          disabled={loading}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-600/50 focus:border-red-600/50 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white p-2 rounded-xl transition-all shadow-md flex items-center justify-center shrink-0 border border-red-500/25 disabled:border-transparent cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
