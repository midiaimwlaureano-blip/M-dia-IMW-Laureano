import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2, ShieldCheck, Database, AlertTriangle, Send, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function MaintenanceCenter({ isAdmin, events, scales, users }: { isAdmin: boolean; events: any[]; scales: any[]; users: any[] }) {
  const [oldLogsCount, setOldLogsCount] = useState(0);
  const [oldNotifsCount, setOldNotifsCount] = useState(0);
  const [oldReactionsCount, setOldReactionsCount] = useState(0);
  const [oldScalesCount, setOldScalesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [notifMessage, setNotifMessage] = useState("");
  const [notifTitle, setNotifTitle] = useState("Aviso da Liderança");
  const [notifTarget, setNotifTarget] = useState<string>("all");
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  const handleSendNotification = async () => {
    if (!notifMessage.trim() || !notifTitle.trim()) {
      toast.error("O título e a mensagem são obrigatórios!");
      return;
    }
    
    setIsSendingNotif(true);
    let count = 0;
    try {
      const targetUsers = notifTarget === "all" ? users : users.filter(u => u.uid === notifTarget);
      
      for (const u of targetUsers) {
        await addDoc(collection(db, "notifications"), {
          userId: u.uid,
          title: notifTitle,
          message: notifMessage,
          read: false,
          createdAt: new Date().toISOString()
        });
        count++;
      }
      
      toast.success(`Notificação (Push interno efetuado) enviada para ${count} voluntário(s)! Se possuir Firebase Cloud Functions, o Push Nativo será disparado em background.`);
      setNotifMessage("");
      setNotifTitle("Aviso da Liderança");
      setNotifTarget("all");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar comunicados.");
    } finally {
      setIsSendingNotif(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      calculateCounts();
    }
  }, [isAdmin, events, scales]);

  const calculateCounts = async () => {
    try {
      const now = new Date();
      
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Logs
      // Assumes we have a 'logs' collection with a 'timestamp' or 'createdAt' field.
      // We will just do a client-side filter if query falls back, but let's try direct query if index exists, 
      // or we can fetch all (not ideal). We will fetch limit if possible, or just ignore 'logs' if collection doesn't exist.
      try {
        const logsRef = collection(db, 'logs');
        const logsDocs = await getDocs(logsRef);
        let logsC = 0;
        logsDocs.forEach(d => {
          const data = d.data();
          if (data.createdAt && new Date(data.createdAt) < thirtyDaysAgo) logsC++;
          else if (data.timestamp && new Date(data.timestamp) < thirtyDaysAgo) logsC++;
        });
        setOldLogsCount(logsC);
      } catch(e) {
        setOldLogsCount(0);
      }

      // Notifs
      try {
        const notifRef = collection(db, 'notifications');
        const notifDocs = await getDocs(notifRef);
        let notifC = 0;
        notifDocs.forEach(d => {
           const data = d.data();
           if (data.read && data.createdAt && new Date(data.createdAt) < ninetyDaysAgo) {
              notifC++;
           }
        });
        setOldNotifsCount(notifC);
      } catch(e) {
        setOldNotifsCount(0);
      }

      // Reactions
      try {
        const rRef = collection(db, 'reactions');
        const rDocs = await getDocs(rRef);
        let rC = 0;
        rDocs.forEach(d => {
           const data = d.data();
           let isOld = false;
           if (data.timestamp && new Date(data.timestamp) < ninetyDaysAgo) {
             isOld = true;
           }
           if (isOld) rC++;
        });
        setOldReactionsCount(rC);
      } catch(e) {
        setOldReactionsCount(0);
      }

      // Scales
      let sC = 0;
      scales.forEach(s => {
         const ev = events.find(e => e.id === s.eventId);
         if (ev && new Date(ev.date) < sixMonthsAgo) {
           sC++;
         }
      });
      setOldScalesCount(sC);

    } catch (error) {
      console.error("Erro ao calcular dados de manutenção:", error);
    }
  };

  const confirmAndDelete = async (actionFn: () => Promise<number>, title: string) => {
    const isConfirmed = window.confirm(`Tem certeza? Esta ação é permanente e ajuda a manter seu plano gratuito do Firebase saudável.`);
    if (!isConfirmed) return;
    
    setIsLoading(true);
    const toastId = toast.loading(`Executando: ${title}...`);
    try {
      const deletedCount = await actionFn();
      toast.success(`${deletedCount} registros excluídos com sucesso!`, { id: toastId });
      await calculateCounts();
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro ao limpar dados: ${e.message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLogs = () => confirmAndDelete(async () => {
    let deleted = 0;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const logsRef = collection(db, 'logs');
    const logsDocs = await getDocs(logsRef);
    const promises: Promise<void>[] = [];
    logsDocs.forEach(d => {
        const data = d.data();
        if ((data.createdAt && new Date(data.createdAt) < thirtyDaysAgo) || (data.timestamp && new Date(data.timestamp) < thirtyDaysAgo)) {
          promises.push(deleteDoc(doc(db, 'logs', d.id)));
          deleted++;
        }
    });
    await Promise.all(promises);
    return deleted;
  }, "Limpeza de Logs");

  const handleClearNotifs = () => confirmAndDelete(async () => {
    let deleted = 0;
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const notifRef = collection(db, 'notifications');
    const notifDocs = await getDocs(notifRef);
    const promises: Promise<void>[] = [];
    notifDocs.forEach(d => {
        const data = d.data();
        if (data.read && data.createdAt && new Date(data.createdAt) < ninetyDaysAgo) {
          promises.push(deleteDoc(doc(db, 'notifications', d.id)));
          deleted++;
        }
    });
    await Promise.all(promises);
    return deleted;
  }, "Limpeza de Notificações Lidas");

  const handleClearReactions = () => confirmAndDelete(async () => {
    let deleted = 0;
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const rRef = collection(db, 'reactions');
    const rDocs = await getDocs(rRef);
    const promises: Promise<void>[] = [];
    rDocs.forEach(d => {
        const data = d.data();
        if (data.timestamp && new Date(data.timestamp) < ninetyDaysAgo) {
          promises.push(deleteDoc(doc(db, 'reactions', d.id)));
          deleted++;
        }
    });
    await Promise.all(promises);
    return deleted;
  }, "Limpeza de Reações");

  const handleClearScales = () => confirmAndDelete(async () => {
    let deleted = 0;
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const promises: Promise<void>[] = [];
    scales.forEach(s => {
       const ev = events.find(e => e.id === s.eventId);
       if (ev && new Date(ev.date) < sixMonthsAgo) {
         promises.push(deleteDoc(doc(db, 'scales', s.id)));
         deleted++;
       }
    });
    await Promise.all(promises);
    return deleted;
  }, "Limpeza de Escalas Antigas");

  const totalAccumulated = oldLogsCount + oldNotifsCount + oldReactionsCount + oldScalesCount;

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="text-red-500 w-16 h-16 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
        <p className="text-gray-500 max-w-md">Você não tem permissão para acessar esta área central de manutenção.</p>
        <button onClick={() => window.location.reload()} className="mt-6 font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">Voltar para o Início</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manutenção</h2>
          <p className="text-gray-500 text-sm">Controle e otimização do banco de dados (Firebase Spark).</p>
        </div>
      </div>

      {totalAccumulated > 500 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 flex flex-col md:flex-row items-center gap-6 justify-between animate-in slide-in-from-top-4 fade-in">
          <div className="flex items-center gap-4 text-amber-800">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Sugestão de Manutenção</h3>
              <p className="text-sm opacity-90">Você possui muitos dados antigos acumulados ({totalAccumulated} registros). Deseja otimizar o banco de dados agora?</p>
            </div>
          </div>
          <button
            onClick={() => {
               if(oldLogsCount > 0) handleClearLogs();
               if(oldNotifsCount > 0) handleClearNotifs();
               if(oldReactionsCount > 0) handleClearReactions();
               if(oldScalesCount > 0) handleClearScales();
            }}
            disabled={isLoading}
            className="shrink-0 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-md shadow-amber-600/20 disabled:opacity-50"
          >
            Limpar Tudo Agora
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MaintenanceCard
          icon={<Database size={24} />}
          title="Logs Antigos"
          description="Excluir documentos da coleção logs com mais de 30 dias."
          count={oldLogsCount}
          onClear={handleClearLogs}
          isLoading={isLoading}
          color="stone"
          totalAccumulated={totalAccumulated}
        />
        <MaintenanceCard
          icon={<Trash2 size={24} />}
          title="Notificações Lidas"
          description="Excluir notificações lidas com mais de 90 dias."
          count={oldNotifsCount}
          onClear={handleClearNotifs}
          isLoading={isLoading}
          color="blue"
          totalAccumulated={totalAccumulated}
        />
        <MaintenanceCard
          icon={<Trash2 size={24} />}
          title="Reações (Emojis) Antigas"
          description="Excluir emojis/reações de eventos passados há mais de 90 dias."
          count={oldReactionsCount}
          onClear={handleClearReactions}
          isLoading={isLoading}
          color="rose"
          totalAccumulated={totalAccumulated}
        />
        <MaintenanceCard
          icon={<Trash2 size={24} />}
          title="Escalas Antigas"
          description="Excluir escalas de eventos ocorridos há mais de 6 meses."
          count={oldScalesCount}
          onClear={handleClearScales}
          isLoading={isLoading}
          color="indigo"
          totalAccumulated={totalAccumulated}
        />
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Send size={20} className="text-indigo-600" />
          Comunicado Rápido (Push)
        </h3>
        <p className="text-sm text-gray-500 mb-6">Envie um alerta imediato para o celular dos voluntários. Se o usuário ativou as notificações, o celular irá "apitar".</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Destinatário
            </label>
            <select
              title="Destinatário"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
              value={notifTarget}
              onChange={(e) => setNotifTarget(e.target.value)}
            >
              <option value="all">Todos os Voluntários</option>
              {users.map(u => (
                <option key={u.uid} value={u.uid}>{u.displayName} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Título
            </label>
            <input
              type="text"
              placeholder="Ex: Ensaio cancelado!"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Mensagem
            </label>
            <textarea
              placeholder="Digite o aviso importante..."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 transition-colors resize-none h-24"
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
            />
          </div>

          <button
            onClick={handleSendNotification}
            disabled={isSendingNotif || !notifMessage.trim() || !notifTitle.trim()}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {isSendingNotif ? "Enviando..." : "Disparar Alerta Push"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MaintenanceCard({ icon, title, description, count, onClear, isLoading, color, totalAccumulated }: any) {
  const colorMap: any = {
    stone: "bg-stone-50 border-stone-100 text-stone-600",
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    rose: "bg-rose-50 border-rose-100 text-rose-600",
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-600",
  };

  const isDisabled = isLoading || count === 0 || totalAccumulated <= 500;

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
      <div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorMap[color]}`}>
          {icon}
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
        <p className="text-gray-500 text-sm mb-4">{description}</p>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
        <div className="text-sm font-bold text-gray-600">
          <span className={count > 0 ? "text-amber-600" : "text-green-600"}>
            {count}
          </span> registros
        </div>
        <button
          onClick={onClear}
          disabled={isDisabled}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 font-bold rounded-xl transition-all text-sm flex items-center gap-2"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
