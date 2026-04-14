import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  where,
  limit,
  setDoc,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { useAuth } from './contexts/AuthContext';
import { ChurchEvent, Scale, User, CheckIn, Notification, Announcement, Reaction, Setlist, Cronograma } from './types';
import { 
  Calendar as CalendarIcon, 
  Users, 
  CheckCircle, 
  Bell, 
  Plus, 
  Trash2, 
  Edit, 
  LogOut, 
  LayoutDashboard,
  Sparkles,
  Clock,
  ChevronRight,
  User as UserIcon,
  Settings,
  Megaphone,
  FileText,
  CalendarDays,
  ChevronLeft,
  X,
  Save,
  Send,
  Heart,
  ThumbsUp,
  Smile,
  MessageSquare,
  Download,
  ExternalLink
} from 'lucide-react';
import { formatDate, cn } from './lib/utils';
import { parseCommand } from './services/aiService';
import { Toaster, toast } from 'sonner';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function App() {
  const { user, loading, login, logout, isAdmin, isCoordinator } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [layoutMode, setLayoutMode] = useState<'modern' | 'compact'>('modern');
  const [navStyle, setNavStyle] = useState<'sidebar' | 'top'>('sidebar');
  const [theme, setTheme] = useState<'indigo' | 'red' | 'blue' | 'rose' | 'sky' | 'imw'>('imw');
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [scales, setScales] = useState<Scale[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [cronogramas, setCronogramas] = useState<Cronograma[]>([]);
  const [aiCommand, setAiCommand] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Theme effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const upcomingEvents = events.filter(e => e.status !== 'CONCLUIDO' && startOfDay(new Date(e.date)) >= startOfDay(new Date()));
  const pastEvents = events.filter(e => e.status === 'CONCLUIDO' || startOfDay(new Date(e.date)) < startOfDay(new Date()));

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<User | null>(null);
  const [selectedEventForScale, setSelectedEventForScale] = useState<ChurchEvent | null>(null);

  // Real-time listeners
  useEffect(() => {
    if (!user) return;

    const qEvents = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChurchEvent)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'events'));

    const unsubScales = onSnapshot(collection(db, 'scales'), (snapshot) => {
      setScales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scale)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'scales'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubCheckins = onSnapshot(collection(db, 'checkins'), (snapshot) => {
      setCheckins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CheckIn)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'checkins'));

    const qNotifs = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(20));
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));

    const qAnnouncements = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'announcements'));

    const unsubReactions = onSnapshot(collection(db, 'reactions'), (snapshot) => {
      setReactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reaction)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'reactions'));

    const unsubSetlists = onSnapshot(collection(db, 'setlists'), (snapshot) => {
      setSetlists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Setlist)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'setlists'));

    const unsubCronogramas = onSnapshot(collection(db, 'cronogramas'), (snapshot) => {
      setCronogramas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cronograma)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'cronogramas'));

    return () => {
      unsubEvents();
      unsubScales();
      unsubUsers();
      unsubCheckins();
      unsubNotifs();
      unsubAnnouncements();
      unsubReactions();
      unsubSetlists();
      unsubCronogramas();
    };
  }, [user]);

  // Automatic Event Status Update
  useEffect(() => {
    if (!events.length || !isAdmin) return;

    const updatePastEvents = async () => {
      const now = new Date();
      const pastEvents = events.filter(e => e.status !== 'CONCLUIDO' && new Date(e.date) < now);
      
      for (const event of pastEvents) {
        try {
          await updateDoc(doc(db, 'events', event.id), { status: 'CONCLUIDO' });
        } catch (error) {
          console.error("Error updating event status:", error);
        }
      }
    };

    updatePastEvents();
    const interval = setInterval(updatePastEvents, 1000 * 60 * 60); // Check every hour
    return () => clearInterval(interval);
  }, [events, isAdmin]);
  const performAutoSchedule = async (eventId: string, currentScales: Scale[], currentUsers: User[]) => {
    const roles = ['Som', 'Câmera', 'Projeção', 'Mídia', 'Vídeo', 'Fotos', 'Cantina', 'Doces', 'Iluminação', 'Recepção', 'Café', 'Placas', 'Anúncios']; 
    const newAssignments: any[] = [];
    const usedUserIds = new Set<string>();
    
    const userParticipation: Record<string, number> = {};
    currentUsers.forEach(u => {
      userParticipation[u.uid] = currentScales.reduce((acc, s) => 
        acc + s.assignments.filter(a => a.userId === u.uid).length, 0
      );
    });

    roles.forEach(role => {
      let eligibleUsers = currentUsers.filter(u => 
        !usedUserIds.has(u.uid) && 
        (u.specialty?.toLowerCase().includes(role.toLowerCase()))
      );
      
      if (eligibleUsers.length === 0) {
        // Fallback to anyone if no one has the specialty, but still prefer those with fewer assignments
        eligibleUsers = currentUsers.filter(u => !usedUserIds.has(u.uid));
      }
      
      // Add some randomness to avoid same people every time
      eligibleUsers.sort((a, b) => {
        const diff = (userParticipation[a.uid] || 0) - (userParticipation[b.uid] || 0);
        if (diff === 0) return Math.random() - 0.5;
        return diff;
      });

      if (eligibleUsers.length > 0) {
        const selected = eligibleUsers[0];
        newAssignments.push({ userId: selected.uid, roles: [role] });
        usedUserIds.add(selected.uid);
      }
    });

    const scaleRef = collection(db, 'scales');
    const q = query(scaleRef, where('eventId', '==', eventId));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      await updateDoc(doc(db, 'scales', snap.docs[0].id), { assignments: newAssignments });
    } else {
      await addDoc(collection(db, 'scales'), { eventId, assignments: newAssignments });
    }
  };

  const generateRecurringEvents = async (baseEvent: any, durationMonths: number = 3, autoSchedule: boolean = false) => {
    if (!baseEvent.isRecurring || !baseEvent.daysOfWeek) return;
    
    const eventsToCreate = [];
    const startDate = new Date(baseEvent.date);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);
    
    const recurrenceId = Math.random().toString(36).substr(2, 9);
    
    let currentDate = new Date(startDate);
    // Skip the first one if it's already being created manually
    currentDate.setDate(currentDate.getDate() + 1);

    while (currentDate <= endDate) {
      if (baseEvent.daysOfWeek.includes(currentDate.getDay())) {
        eventsToCreate.push({
          ...baseEvent,
          date: currentDate.toISOString(),
          recurrenceId,
          createdAt: new Date().toISOString()
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const ev of eventsToCreate) {
      const docRef = await addDoc(collection(db, 'events'), ev);
      if (autoSchedule) {
        await performAutoSchedule(docRef.id, scales, allUsers);
      } else {
        await addDoc(collection(db, 'scales'), { eventId: docRef.id, assignments: [] });
      }
    }
    return eventsToCreate.length;
  };

  const handleDuplicateEvent = async (event: ChurchEvent) => {
    const toastId = toast.loading("Duplicando evento...");
    try {
      const newEvent = {
        ...event,
        id: undefined,
        title: `${event.title} (Cópia)`,
        date: new Date(new Date(event.date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +1 week
        createdAt: new Date().toISOString()
      };
      delete (newEvent as any).id;
      const docRef = await addDoc(collection(db, 'events'), newEvent);
      
      // Also duplicate scale if it exists
      const existingScale = scales.find(s => s.eventId === event.id);
      if (existingScale) {
        await addDoc(collection(db, 'scales'), { eventId: docRef.id, assignments: existingScale.assignments });
      } else {
        await addDoc(collection(db, 'scales'), { eventId: docRef.id, assignments: [] });
      }
      
      toast.success("Evento duplicado para a próxima semana!", { id: toastId });
    } catch (error) {
      toast.error("Erro ao duplicar evento.", { id: toastId });
    }
  };

  const handleReaction = async (targetId: string, emoji: string) => {
    if (!user) return;
    
    const existingReaction = reactions.find(r => r.targetId === targetId && r.userId === user.uid && r.emoji === emoji);
    
    if (existingReaction) {
      await deleteDoc(doc(db, 'reactions', existingReaction.id));
    } else {
      await addDoc(collection(db, 'reactions'), {
        targetId,
        userId: user.uid,
        emoji,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleBatchGenerateScales = async () => {
    const toastId = toast.loading("Gerando escalas para eventos futuros...");
    try {
      const futureEvents = events.filter(e => new Date(e.date) > new Date());
      let count = 0;
      
      for (const event of futureEvents) {
        const scale = scales.find(s => s.eventId === event.id);
        if (!scale || scale.assignments.length === 0) {
          await performAutoSchedule(event.id, scales, allUsers);
          count++;
        }
      }
      toast.success(`${count} escalas geradas automaticamente!`, { id: toastId });
    } catch (error) {
      toast.error("Erro ao gerar escalas em lote.", { id: toastId });
    }
  };

  const handleAiCommand = async () => {
    if (!aiCommand.trim()) return;
    setIsAiLoading(true);
    const toastId = toast.loading("Processando comando...");
    try {
      const result = await parseCommand(aiCommand);
      
      if (result.action === 'CREATE_EVENT') {
        const eventData = {
          ...result.event,
          createdBy: user?.uid,
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'events'), eventData);
        await addDoc(collection(db, 'scales'), { eventId: docRef.id, assignments: [] });
        
        if (result.event.isRecurring) {
          const count = await generateRecurringEvents(eventData, result.event.durationMonths || 3);
          toast.success(`Evento "${result.event.title}" e mais ${count} ocorrências criadas!`, { id: toastId });
        } else {
          toast.success(`Evento "${result.event.title}" criado!`, { id: toastId });
        }
      } 
      else if (result.action === 'CREATE_VOLUNTEER') {
        const newUser = {
          ...result.volunteer,
          createdAt: new Date().toISOString(),
          color: '#'+Math.floor(Math.random()*16777215).toString(16)
        };
        await addDoc(collection(db, 'users'), newUser);
        toast.success(`Voluntário "${result.volunteer.displayName}" cadastrado!`, { id: toastId });
      }
      else if (result.action === 'CREATE_NOTIFICATION') {
        const targetUsers = result.notification.targetUserEmail 
          ? allUsers.filter(u => u.email === result.notification.targetUserEmail)
          : allUsers;
        
        for (const u of targetUsers) {
          await addDoc(collection(db, 'notifications'), {
            userId: u.uid,
            title: result.notification.title,
            message: result.notification.message,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
        toast.success("Notificações enviadas!", { id: toastId });
      }
      else if (result.action === 'CREATE_ANNOUNCEMENT') {
        await addDoc(collection(db, 'announcements'), {
          ...result.announcement,
          createdAt: new Date().toISOString()
        });
        toast.success(`Anúncio "${result.announcement.title}" criado!`, { id: toastId });
      }
      setAiCommand('');
    } catch (error) {
      console.error("Erro no comando IA:", error);
      toast.error("Erro ao processar comando. Tente ser mais específico.", { id: toastId });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCheckIn = async (eventId: string, status: 'PRESENTE' | 'AUSENTE' | 'ATRASADO') => {
    try {
      const existing = checkins.find(c => c.eventId === eventId && c.userId === user?.uid);
      if (existing) {
        await updateDoc(doc(db, 'checkins', existing.id), { status, timestamp: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'checkins'), {
          eventId,
          userId: user?.uid,
          status,
          timestamp: new Date().toISOString()
        });
      }
      toast.success("Check-in realizado!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'checkins');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteDoc(doc(db, 'events', eventId));
      toast.success("Evento excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
      handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-headline font-bold text-primary animate-pulse uppercase tracking-widest">MÍDIA IMW LAUREANO</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-[2.5rem] p-10 shadow-2xl border border-stone-100 dark:border-stone-800 text-center space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary shadow-inner">
              <CalendarIcon size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-extrabold text-primary tracking-tighter">MÍDIA IMW</h1>
              <p className="text-sm font-bold text-stone-400 uppercase tracking-[0.3em]">LAUREANO</p>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-on-surface">Bem-vindo ao Sanctuary</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">Acesse sua conta para gerenciar escalas, eventos e voluntários da nossa igreja.</p>
          </div>
          <button 
            onClick={login}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'calendar', label: 'Calendário', icon: <CalendarIcon size={20} /> },
    { id: 'events', label: 'Eventos', icon: <CalendarDays size={20} /> },
    { id: 'scales', label: 'Escalas', icon: <Clock size={20} /> },
    { id: 'volunteers', label: 'Voluntários', icon: <Users size={20} /> },
    { id: 'announcements', label: 'Anúncios', icon: <Megaphone size={20} /> },
    { id: 'setlist', label: 'Setlist', icon: <FileText size={20} /> },
    { id: 'cronograma', label: 'Cronograma', icon: <Clock size={20} /> },
    { id: 'notifications', label: 'Notificações', icon: <Bell size={20} /> },
  ];

  return (
    <div className={cn("min-h-screen flex bg-background", isDarkMode && "dark")}>
      <Toaster position="top-right" richColors />
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col bg-white dark:bg-stone-950 border-r border-stone-100 dark:border-stone-900 z-50">
        <div className="p-8 flex items-center gap-3">
          <div>
            <h1 className="text-lg font-headline font-extrabold text-primary tracking-tighter leading-none">MÍDIA IMW</h1>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">LAUREANO</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                activeTab === item.id 
                  ? "bg-primary/10 text-primary font-bold" 
                  : "text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-900 hover:text-primary"
              )}
            >
              <span className={cn("transition-transform group-hover:scale-110", activeTab === item.id && "text-primary")}>
                {item.icon}
              </span>
              <span className="text-xs uppercase tracking-wider font-headline">{item.label}</span>
              {item.id === 'notifications' && notifications.filter(n => !n.read).length > 0 && (
                <span className="ml-auto w-2 h-2 bg-primary rounded-full"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto space-y-2 border-t border-stone-100 dark:border-stone-900">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-stone-900 rounded-xl text-xs font-bold text-stone-500 hover:text-primary transition-all"
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? <Smile size={18} /> : <Sparkles size={18} />}
              <span className="uppercase tracking-wider">Modo {isDarkMode ? 'Claro' : 'Escuro'}</span>
            </div>
          </button>
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-900 rounded-xl transition-all"
          >
            <UserIcon size={18} />
            <span className="text-xs uppercase tracking-wider font-bold">Meu Perfil</span>
          </button>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span className="text-xs uppercase tracking-wider font-bold">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:ml-64 pb-24 lg:pb-0">
        {/* Top Header - Mobile & Desktop */}
        <header className="sticky top-0 z-40 glass-effect border-b border-stone-100 dark:border-stone-900 h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <h1 className="text-sm font-headline font-extrabold text-primary tracking-tighter leading-none">MÍDIA IMW</h1>
          </div>
          
          <div className="flex-1 max-w-md mx-4 hidden sm:block">
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar no Sanctuary..." 
                className="w-full bg-stone-100 dark:bg-stone-900 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 text-stone-500 hover:text-primary transition-all"
            >
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-stone-900"></span>
              )}
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-stone-100 dark:border-stone-800 cursor-pointer group" onClick={() => setIsProfileModalOpen(true)}>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{user.displayName}</p>
                <p className="text-[10px] text-stone-400 uppercase tracking-tighter">{user.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-white dark:border-stone-800 overflow-hidden shadow-sm">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary font-bold">{user.displayName[0]}</div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-10 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <header className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary">Dashboard Principal</p>
                <h2 className="text-4xl lg:text-5xl font-headline font-extrabold tracking-tighter text-on-surface">Olá, {user.displayName.split(' ')[0]}!</h2>
              </header>

              {/* Bible Verse Hero */}
              <section className="relative overflow-hidden rounded-[2.5rem] min-h-[300px] flex items-end p-8 lg:p-12 group">
                <img 
                  src="https://picsum.photos/seed/church/1200/600" 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                <div className="relative z-10 max-w-2xl space-y-4">
                  <span className="inline-block px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full">Palavra do Dia</span>
                  <h3 className="text-white text-2xl lg:text-4xl font-headline font-bold italic leading-tight">
                    "Servi ao Senhor com alegria; apresentai-vos diante dele com cântico."
                  </h3>
                  <p className="text-white/80 text-lg font-medium">— Salmos 100:2</p>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-10">
                  {/* Next Event Card */}
                  <section className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                      <h4 className="text-xl font-headline font-bold text-on-surface">Sua Próxima Escala</h4>
                      <button onClick={() => setActiveTab('calendar')} className="text-xs font-bold text-secondary hover:text-primary transition-colors uppercase tracking-widest">Ver Agenda</button>
                    </div>
                    {upcomingEvents.length > 0 ? (
                      <div className="bento-card flex flex-col md:flex-row gap-8 items-center">
                        <div className="w-24 h-24 bg-primary/5 rounded-[2rem] flex flex-col items-center justify-center text-primary shadow-inner">
                          <span className="text-[10px] font-bold uppercase tracking-widest">{format(new Date(upcomingEvents[0].date), 'MMM', { locale: ptBR })}</span>
                          <span className="text-4xl font-headline font-extrabold leading-none">{format(new Date(upcomingEvents[0].date), 'dd')}</span>
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-2">
                          <h5 className="text-2xl font-headline font-bold text-on-surface">{upcomingEvents[0].title}</h5>
                          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-stone-400 text-sm font-medium">
                            <span className="flex items-center gap-1.5"><Clock size={16} /> {format(new Date(upcomingEvents[0].date), 'HH:mm')}h</span>
                            <span className="flex items-center gap-1.5"><CalendarIcon size={16} /> {format(new Date(upcomingEvents[0].date), "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => { setSelectedEventForScale(upcomingEvents[0]); setIsScaleModalOpen(true); }}
                          className="btn-primary w-full md:w-auto"
                        >
                          <CheckCircle size={20} /> Confirmar Presença
                        </button>
                      </div>
                    ) : (
                      <div className="bento-card text-center py-12 space-y-4">
                        <div className="w-16 h-16 bg-stone-50 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto text-stone-300">
                          <Clock size={32} />
                        </div>
                        <p className="text-stone-400 font-medium">Nenhuma escala programada para você no momento.</p>
                      </div>
                    )}
                  </section>

                  {/* Setlist & Cronograma Bento Grid */}
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bento-card group cursor-pointer" onClick={() => setActiveTab('setlist')}>
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
                          <FileText size={24} />
                        </div>
                        <ChevronRight className="text-stone-300 group-hover:text-secondary transition-all group-hover:translate-x-1" />
                      </div>
                      <h5 className="text-xl font-headline font-bold text-on-surface mb-2">Setlist de Louvor</h5>
                      <p className="text-sm text-stone-400 leading-relaxed mb-6">Confira as músicas selecionadas para os próximos cultos e ensaios.</p>
                      <div className="pt-6 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{setlists.length} Listas disponíveis</span>
                        <span className="text-xs font-bold text-secondary">Ver Tudo</span>
                      </div>
                    </div>

                    <div className="bento-card group cursor-pointer" onClick={() => setActiveTab('cronograma')}>
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-tertiary/10 rounded-2xl flex items-center justify-center text-tertiary">
                          <Clock size={24} />
                        </div>
                        <ChevronRight className="text-stone-300 group-hover:text-tertiary transition-all group-hover:translate-x-1" />
                      </div>
                      <h5 className="text-xl font-headline font-bold text-on-surface mb-2">Cronograma do Culto</h5>
                      <p className="text-sm text-stone-400 leading-relaxed mb-6">Organização detalhada de cada momento da nossa celebração.</p>
                      <div className="pt-6 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{cronogramas.length} Roteiros ativos</span>
                        <span className="text-xs font-bold text-tertiary">Ver Tudo</span>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-4 space-y-8">
                  {/* Mural da Igreja */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-2 px-2">
                      <Megaphone size={20} className="text-primary" />
                      <h4 className="text-xl font-headline font-bold text-on-surface">Mural da Igreja</h4>
                    </div>
                    <div className="space-y-4">
                      {announcements.slice(0, 3).map(ann => (
                        <div key={ann.id} className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-100 dark:border-stone-800 shadow-sm space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="px-2 py-1 bg-primary/5 text-primary text-[10px] font-bold rounded-lg uppercase">{ann.date}</span>
                            <span className="text-[10px] text-stone-400 font-bold">{ann.time}</span>
                          </div>
                          <h6 className="font-bold text-on-surface">{ann.title}</h6>
                          <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">{ann.description}</p>
                        </div>
                      ))}
                      <button onClick={() => setActiveTab('announcements')} className="w-full py-4 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 text-stone-400 text-xs font-bold uppercase tracking-widest hover:border-primary hover:text-primary transition-all">
                        Ver Todos os Anúncios
                      </button>
                    </div>
                  </section>

                  {/* Impact Card */}
                  <section className="bg-secondary rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-secondary/20">
                    <Heart size={120} className="absolute -right-8 -bottom-8 text-white/10 rotate-12" />
                    <div className="relative z-10 space-y-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Impacto da Semana</p>
                      <h5 className="text-5xl font-headline font-extrabold tracking-tighter">128</h5>
                      <p className="text-sm font-medium text-white/80 leading-relaxed">Pessoas servidas pelo seu ministério nos últimos 7 dias.</p>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <CalendarView 
              events={upcomingEvents} 
              scales={scales} 
              allUsers={allUsers} 
            />
          )}

          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-headline font-bold text-on-surface">Agenda de Eventos</h3>
                {isAdmin && (
                  <button 
                    onClick={() => { setEditingEvent(null); setIsEventModalOpen(true); }}
                    className="btn-primary"
                  >
                    <Plus size={20} /> Novo Evento
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map(ev => (
                  <div key={ev.id} className="bento-card space-y-4 border-l-4 border-l-primary">
                    <div className="flex justify-between items-start">
                      <span className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-bold rounded-full uppercase">{ev.type}</span>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingEvent(ev); setIsEventModalOpen(true); }} className="p-2 text-stone-400 hover:text-primary transition-colors">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteEvent(ev.id)} className="p-2 text-stone-400 hover:text-red-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xl font-headline font-bold text-on-surface">{ev.title}</h4>
                      <p className="text-sm text-stone-400 mt-1">{format(new Date(ev.date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-stone-50 dark:border-stone-800 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {scales.find(s => s.eventId === ev.id)?.assignments.slice(0, 3).map(a => (
                          <div key={a.userId} className="w-8 h-8 rounded-full border-2 border-white dark:border-stone-900 bg-stone-100 flex items-center justify-center text-[10px] font-bold">
                            {allUsers.find(u => u.uid === a.userId)?.displayName[0]}
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={() => { setSelectedEventForScale(ev); setIsScaleModalOpen(true); }}
                        className="text-xs font-bold text-secondary hover:text-primary transition-colors uppercase tracking-widest"
                      >
                        Ver Escala
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {pastEvents.length > 0 && (
                <div className="mt-12 space-y-6">
                  <h3 className="text-xl font-headline font-bold text-stone-400">Eventos Passados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                    {pastEvents.map(ev => (
                      <div key={ev.id} className="bento-card space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-500 text-[10px] font-bold rounded-full uppercase">{ev.type}</span>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingEvent(ev); setIsEventModalOpen(true); }} className="p-2 text-stone-400 hover:text-primary transition-colors">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDeleteEvent(ev.id)} className="p-2 text-stone-400 hover:text-red-600 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xl font-headline font-bold text-on-surface line-through decoration-stone-300 dark:decoration-stone-700">{ev.title}</h4>
                          <p className="text-sm text-stone-400 mt-1">{format(new Date(ev.date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'scales' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-headline font-bold text-on-surface">Gestão de Escalas</h3>
                {isAdmin && (
                  <button onClick={handleBatchGenerateScales} className="btn-secondary">
                    <Sparkles size={20} /> Gerar Escalas Automáticas
                  </button>
                )}
              </div>
              <div className="space-y-6">
                {upcomingEvents.map(ev => {
                  const scale = scales.find(s => s.eventId === ev.id);
                  return (
                    <div key={ev.id} className="bento-card border-l-4 border-l-secondary">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                          <h4 className="text-xl font-headline font-bold text-on-surface">{ev.title}</h4>
                          <p className="text-sm text-stone-400">{format(new Date(ev.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <button 
                          onClick={() => { setSelectedEventForScale(ev); setIsScaleModalOpen(true); }}
                          className="btn-primary"
                        >
                          <Edit size={18} /> {isAdmin ? 'Editar Escala' : 'Ver Detalhes'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {scale?.assignments.map(a => (
                          <div key={a.userId} className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-stone-900 flex items-center justify-center text-primary font-bold shadow-sm">
                              {allUsers.find(u => u.uid === a.userId)?.displayName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-on-surface">{allUsers.find(u => u.uid === a.userId)?.displayName}</p>
                              <p className="text-[10px] text-stone-400 uppercase font-bold">{a.roles.join(', ')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {pastEvents.length > 0 && (
                <div className="mt-12 space-y-6">
                  <h3 className="text-xl font-headline font-bold text-stone-400">Escalas Passadas</h3>
                  <div className="space-y-6 opacity-60">
                    {pastEvents.map(ev => {
                      const scale = scales.find(s => s.eventId === ev.id);
                      return (
                        <div key={ev.id} className="bento-card">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div>
                              <h4 className="text-xl font-headline font-bold text-on-surface line-through decoration-stone-300 dark:decoration-stone-700">{ev.title}</h4>
                              <p className="text-sm text-stone-400">{format(new Date(ev.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <button 
                              onClick={() => { setSelectedEventForScale(ev); setIsScaleModalOpen(true); }}
                              className="btn-secondary"
                            >
                              <Edit size={18} /> Ver Detalhes
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {scale?.assignments.map(a => (
                              <div key={a.userId} className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-stone-900 flex items-center justify-center text-stone-400 font-bold shadow-sm">
                                  {allUsers.find(u => u.uid === a.userId)?.displayName[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-stone-500">{allUsers.find(u => u.uid === a.userId)?.displayName}</p>
                                  <p className="text-[10px] text-stone-400 uppercase font-bold">{a.roles.join(', ')}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-headline font-bold text-on-surface">Mural de Anúncios</h3>
                {isAdmin && (
                  <button 
                    onClick={() => setIsAnnouncementModalOpen(true)}
                    className="btn-primary"
                  >
                    <Plus size={20} /> Novo Anúncio
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {announcements.map(ann => (
                  <div key={ann.id} className="bento-card space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-bold rounded-full uppercase">{ann.date}</span>
                        <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-500 text-[10px] font-bold rounded-full uppercase">{ann.time}</span>
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={async () => { 
                            try {
                              await deleteDoc(doc(db, 'announcements', ann.id)); 
                              toast.success("Anúncio excluído");
                            } catch (error) {
                              handleFirestoreError(error, OperationType.DELETE, 'announcements');
                            }
                          }} 
                          className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xl font-headline font-bold text-on-surface">{ann.title}</h4>
                      <p className="text-sm text-stone-400 mt-2 leading-relaxed">{ann.description}</p>
                    </div>
                    {ann.pdfUrl && (
                      <div className="pt-4 border-t border-stone-50 dark:border-stone-800">
                        <a href={ann.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-secondary hover:text-primary transition-colors uppercase tracking-widest">
                          <FileText size={16} /> Abrir Anexo PDF
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-headline font-bold text-on-surface">Suas Notificações</h3>
                {isAdmin && (
                  <button 
                    onClick={() => setIsNotifModalOpen(true)}
                    className="btn-primary"
                  >
                    <Send size={20} /> Enviar Notificação
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {notifications.map(notif => (
                  <div key={notif.id} className={cn(
                    "bento-card transition-all",
                    notif.read ? "opacity-60" : "border-l-4 border-l-primary"
                  )}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-headline font-bold text-on-surface">{notif.title}</h4>
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{formatDate(notif.createdAt)}</span>
                    </div>
                    <p className="text-sm text-stone-400 mb-6">{notif.message}</p>
                    <div className="flex items-center gap-4 pt-4 border-t border-stone-50 dark:border-stone-800">
                      {!notif.read && (
                        <button onClick={() => updateDoc(doc(db, 'notifications', notif.id), { read: true })} className="text-xs font-bold text-primary hover:text-secondary transition-colors uppercase tracking-widest">
                          Marcar como lida
                        </button>
                      )}
                      <button 
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, 'notifications', notif.id));
                            toast.success("Notificação excluída");
                          } catch (error) {
                            handleFirestoreError(error, OperationType.DELETE, 'notifications');
                          }
                        }} 
                        className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-widest"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center py-12">
                    <Bell size={48} className="mx-auto text-stone-200 dark:text-stone-800 mb-4" />
                    <p className="text-stone-400 font-medium">Você não tem novas notificações.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'volunteers' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-headline font-bold text-on-surface">Equipe de Voluntários</h3>
                {isAdmin && (
                  <button 
                    onClick={() => { setEditingVolunteer(null); setIsVolunteerModalOpen(true); }}
                    className="btn-primary"
                  >
                    <Plus size={20} /> Novo Voluntário
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allUsers.map(u => (
                  <div key={u.uid} className="bento-card flex items-center gap-4 relative">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg" style={{ backgroundColor: u.color || '#ba0015' }}>
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                      ) : (
                        u.displayName[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-on-surface truncate">{u.displayName}</h4>
                      <p className="text-xs text-stone-400 mb-2">{u.email}</p>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-md text-[10px] font-bold uppercase">{u.role}</span>
                        {u.specialty && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold uppercase">{u.specialty}</span>}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="absolute top-4 right-4 flex gap-1">
                        <button onClick={() => { setEditingVolunteer(u); setIsVolunteerModalOpen(true); }} className="p-1.5 text-stone-400 hover:text-primary transition-colors">
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={async () => { 
                            try {
                              await deleteDoc(doc(db, 'users', u.uid)); 
                              toast.success("Voluntário excluído");
                            } catch (error) {
                              handleFirestoreError(error, OperationType.DELETE, 'users');
                            }
                          }} 
                          className="p-1.5 text-stone-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {activeTab === 'setlist' && (
          <SetlistView setlists={setlists} isAdmin={isAdmin} theme={theme} />
        )}

        {activeTab === 'cronograma' && (
          <CronogramaView cronogramas={cronogramas} isAdmin={isAdmin} theme={theme} />
        )}
        </div>
      </main>

      {/* Modals */}
      {isProfileModalOpen && (
        <Modal title="Seu Perfil" onClose={() => setIsProfileModalOpen(false)}>
          <ProfileForm user={user} onSave={() => setIsProfileModalOpen(false)} theme={theme} />
        </Modal>
      )}
      {isEventModalOpen && (
        <Modal title={editingEvent ? "Editar Evento" : "Novo Evento"} onClose={() => setIsEventModalOpen(false)}>
          <EventForm 
            initialData={editingEvent} 
            theme={theme}
            onSave={async (data) => {
              const toastId = toast.loading(editingEvent ? "Atualizando..." : "Criando...");
              try {
                if (editingEvent) {
                  await updateDoc(doc(db, 'events', editingEvent.id), data);
                  toast.success("Evento atualizado!", { id: toastId });
                } else {
                  const eventData = { ...data, createdBy: user.uid, createdAt: new Date().toISOString() };
                  const docRef = await addDoc(collection(db, 'events'), eventData);
                  await addDoc(collection(db, 'scales'), { eventId: docRef.id, assignments: [] });
                  
                  if (data.isRecurring) {
                    const count = await generateRecurringEvents(eventData, data.durationMonths || 3, data.autoSchedule);
                    toast.success(`Evento criado com mais ${count} ocorrências!`, { id: toastId });
                  } else {
                    toast.success("Evento criado!", { id: toastId });
                  }
                }
                setIsEventModalOpen(false);
              } catch (error) {
                toast.error("Erro ao salvar evento.", { id: toastId });
              }
            }} 
          />
        </Modal>
      )}

      {isNotifModalOpen && (
        <Modal title="Enviar Notificação" onClose={() => setIsNotifModalOpen(false)}>
          <NotificationForm 
            users={allUsers}
            theme={theme}
            onSave={async (data) => {
              const targetUsers = data.userId === 'all' ? allUsers : [allUsers.find(u => u.uid === data.userId)!];
              for (const u of targetUsers) {
                await addDoc(collection(db, 'notifications'), {
                  userId: u.uid,
                  title: data.title,
                  message: data.message,
                  read: false,
                  createdAt: new Date().toISOString()
                });
              }
              toast.success("Notificação enviada!");
              setIsNotifModalOpen(false);
            }}
          />
        </Modal>
      )}

      {isAnnouncementModalOpen && (
        <Modal title="Novo Anúncio" onClose={() => setIsAnnouncementModalOpen(false)}>
          <AnnouncementForm 
            theme={theme}
            onSave={async (data) => {
              await addDoc(collection(db, 'announcements'), { ...data, createdAt: new Date().toISOString() });
              toast.success("Anúncio publicado!");
              setIsAnnouncementModalOpen(false);
            }}
          />
        </Modal>
      )}

      {isScaleModalOpen && selectedEventForScale && (
        <Modal title={`Escala: ${selectedEventForScale.title}`} onClose={() => setIsScaleModalOpen(false)}>
          <ScaleForm 
            event={selectedEventForScale}
            users={allUsers}
            initialScale={scales.find(s => s.eventId === selectedEventForScale.id)}
            allScales={scales}
            allEvents={events}
            theme={theme}
            onSave={async (assignments) => {
              const scale = scales.find(s => s.eventId === selectedEventForScale.id);
              if (scale) {
                await updateDoc(doc(db, 'scales', scale.id), { assignments });
              } else {
                await addDoc(collection(db, 'scales'), { eventId: selectedEventForScale.id, assignments });
              }
              toast.success("Escala atualizada!");
              setIsScaleModalOpen(false);
            }}
          />
        </Modal>
      )}

      {isVolunteerModalOpen && (
        <Modal title={editingVolunteer ? "Editar Voluntário" : "Novo Voluntário"} onClose={() => setIsVolunteerModalOpen(false)}>
          <VolunteerForm 
            initialData={editingVolunteer}
            theme={theme}
            onSave={async (data) => {
              try {
                if (editingVolunteer) {
                  await updateDoc(doc(db, 'users', editingVolunteer.uid), data);
                  toast.success("Voluntário atualizado!");
                } else {
                  // Pre-registering in Firestore
                  await addDoc(collection(db, 'users'), {
                    ...data,
                    createdAt: new Date().toISOString(),
                    color: '#'+Math.floor(Math.random()*16777215).toString(16)
                  });
                  toast.success("Voluntário cadastrado!");
                }
                setIsVolunteerModalOpen(false);
              } catch (error) {
                handleFirestoreError(error, OperationType.WRITE, 'users');
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}

const REACTION_EMOJIS = ['❤️', '👍', '🙏', '🙌', '🔥'];

function ReactionPicker({ onReact, currentUserId, reactions }: { onReact: (emoji: string) => void, currentUserId?: string, reactions: Reaction[] }) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-100 overflow-x-auto max-w-full">
      {REACTION_EMOJIS.map(emoji => {
        const hasReacted = reactions.some(r => r.userId === currentUserId && r.emoji === emoji);
        return (
          <button
            key={emoji}
            onClick={(e) => { e.stopPropagation(); onReact(emoji); }}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-125 shrink-0",
              hasReacted ? "bg-indigo-100" : "hover:bg-white"
            )}
          >
            <span className="text-sm">{emoji}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReactionDisplay({ reactions, allUsers }: { reactions: Reaction[], allUsers: User[] }) {
  if (reactions.length === 0) return null;

  // Group by emoji
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, Reaction[]>);

  return (
    <div className="space-y-3 mt-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(grouped).map(([emoji, rs]) => (
          <div key={emoji} className="flex items-center gap-1 bg-white border border-gray-100 px-2 py-1 rounded-full shadow-sm group relative">
            <span className="text-xs">{emoji}</span>
            <span className="text-[10px] font-bold text-gray-500">{rs.length}</span>
            
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-xl">
                {rs.map(r => allUsers.find(u => u.uid === r.userId)?.displayName).join(', ')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* List of users who reacted */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest w-full mb-1">Voluntários que reagiram:</p>
        {reactions.map(r => {
          const u = allUsers.find(user => user.uid === r.userId);
          if (!u) return null;
          return (
            <div key={r.id} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
              <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                {u.displayName[0]}
              </div>
              <span className="text-[10px] font-medium text-gray-600">{u.displayName.split(' ')[0]}</span>
              <span className="text-[10px]">{r.emoji}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface EventCardProps {
  key?: string | number;
  event: ChurchEvent;
  onCheckIn: (id: string, s: 'PRESENTE' | 'AUSENTE' | 'ATRASADO') => void;
  userCheckIn?: CheckIn;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  compact?: boolean;
  reactions: Reaction[];
  onReaction: (emoji: string) => void;
  currentUserId?: string;
  allUsers: User[];
  checkins: CheckIn[];
}

function EventCard({ event, onCheckIn, userCheckIn, isAdmin, onEdit, onDelete, onDuplicate, compact, reactions, onReaction, currentUserId, allUsers, checkins }: EventCardProps) {
  const checkedInUsers = checkins.filter(c => c.eventId === event.id && c.status === 'PRESENTE');

  if (compact) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
              event.type === 'CULTO' ? "bg-blue-600 text-white" : event.type === 'ENSAIO' ? "bg-amber-500 text-white" : "bg-rose-900 text-white"
            )}>
              {event.type}
            </span>
            <h4 className="text-sm font-bold text-gray-900 truncate">{event.title}</h4>
          </div>
          <p className="text-[10px] text-gray-500 flex items-center gap-1"><CalendarIcon size={10} /> {formatDate(event.date)}</p>
          
          {checkedInUsers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {checkedInUsers.map(c => {
                const u = allUsers.find(user => user.uid === c.userId);
                return (
                  <div key={c.id} className="bg-green-50 text-green-700 text-[7px] font-bold px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-0.5">
                    <CheckCircle size={7} /> {u?.displayName.split(' ')[0]}
                  </div>
                );
              })}
            </div>
          )}
          
          <ReactionDisplay reactions={reactions} allUsers={allUsers} />
        </div>
        <div className="flex items-center gap-2">
          <div>
            <ReactionPicker onReact={onReaction} currentUserId={currentUserId} reactions={reactions} />
          </div>
          {isAdmin && onDuplicate && (
            <button onClick={onDuplicate} className="p-2 text-stone-400 hover:text-primary transition-colors" title="Duplicar">
              <Plus size={16} />
            </button>
          )}
          {userCheckIn ? (
            <div className="text-green-600">
              <CheckCircle size={16} />
            </div>
          ) : (
            <button onClick={() => onCheckIn(event.id, 'PRESENTE')} className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors">
              <CheckCircle size={16} />
            </button>
          )}
          {isAdmin && (
            <button onClick={onDelete} className="p-2 text-stone-400 hover:text-red-600 transition-colors">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card relative group overflow-hidden">
      {/* Accent bar with wine color */}
      <div className={cn(
        "absolute top-0 left-0 w-full h-1.5",
        event.type === 'CULTO' ? "bg-blue-600" : event.type === 'ENSAIO' ? "bg-sky-400" : "bg-rose-900"
      )} />
      
      <div className="flex justify-between items-start mb-4">
        <span className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
          event.type === 'CULTO' ? "bg-blue-100 text-blue-700" : event.type === 'ENSAIO' ? "bg-sky-100 text-sky-700" : "bg-rose-100 text-rose-900"
        )}>
          {event.type}
        </span>
        {isAdmin && (
          <div className="flex gap-1">
            <button onClick={onDuplicate} className="p-1 text-stone-400 hover:text-primary transition-colors" title="Duplicar"><Plus size={14} /></button>
            <button onClick={onEdit} className="p-1 text-stone-400 hover:text-primary transition-colors"><Edit size={14} /></button>
            <button onClick={onDelete} className="p-1 text-stone-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
          </div>
        )}
      </div>
      <h4 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h4>
      <p className="text-xs text-gray-500 mb-4 flex items-center gap-1"><CalendarIcon size={12} /> {formatDate(event.date)}</p>

      {checkedInUsers.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Presença Confirmada:</p>
          <div className="flex flex-wrap gap-2">
            {checkedInUsers.map(c => {
              const u = allUsers.find(user => user.uid === c.userId);
              return (
                <div key={c.id} className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                  <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-[8px] font-bold text-green-600">
                    {u?.displayName[0]}
                  </div>
                  <span className="text-[10px] font-medium text-green-800">{u?.displayName.split(' ')[0]}</span>
                  <CheckCircle size={10} className="text-green-500" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4">
        <ReactionDisplay reactions={reactions} allUsers={allUsers} />
      </div>

      <div className="pt-4 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ReactionPicker onReact={onReaction} currentUserId={currentUserId} reactions={reactions} />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {userCheckIn ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={16} /> <span className="text-xs font-bold uppercase">{userCheckIn.status}</span>
            </div>
          ) : (
            <button onClick={() => onCheckIn(event.id, 'PRESENTE')} className="w-full sm:w-auto px-4 bg-indigo-50 text-indigo-600 text-[10px] font-bold py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-colors uppercase">Check-in</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-stone-800 rounded-xl transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function EventForm({ initialData, onSave, theme = 'indigo' }: { initialData: ChurchEvent | null, onSave: (data: any) => void, theme?: string }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    date: initialData?.date || '',
    type: initialData?.type || 'CULTO',
    description: initialData?.description || '',
    isRecurring: initialData?.isRecurring || false,
    frequency: initialData?.frequency || 'WEEKLY',
    daysOfWeek: initialData?.daysOfWeek || [],
    durationMonths: 3,
    autoSchedule: false
  });

  const toggleDay = (day: number) => {
    const newDays = formData.daysOfWeek.includes(day)
      ? formData.daysOfWeek.filter(d => d !== day)
      : [...formData.daysOfWeek, day];
    setFormData({ ...formData, daysOfWeek: newDays });
  };

  const themeBg = {
    imw: "bg-red-600 hover:bg-red-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    red: "bg-red-600 hover:bg-red-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    rose: "bg-rose-900 hover:bg-rose-950",
    sky: "bg-sky-400 hover:bg-sky-500"
  }[theme as keyof typeof themeBg] || "bg-indigo-600";

  const themeText = {
    imw: "text-red-600",
    indigo: "text-indigo-600",
    red: "text-red-600",
    blue: "text-blue-600",
    rose: "text-rose-900",
    sky: "text-sky-400"
  }[theme as keyof typeof themeText] || "text-indigo-600";

  const themeBgLight = {
    imw: "bg-red-50",
    indigo: "bg-indigo-50",
    red: "bg-red-50",
    blue: "bg-blue-50",
    rose: "bg-rose-50",
    sky: "bg-sky-50"
  }[theme as keyof typeof themeBgLight] || "bg-indigo-50";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
        <input type="text" className="form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data e Hora</label>
          <input type="datetime-local" className="form-input focus:ring-2 focus:ring-indigo-500" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
          <select className="form-input outline-none focus:ring-2 focus:ring-indigo-500" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
            <option value="CULTO">CULTO</option>
            <option value="ENSAIO">ENSAIO</option>
            <option value="REUNIAO">REUNIAO</option>
          </select>
        </div>
      </div>

      <div className={cn("p-4 rounded-2xl space-y-3", themeBgLight)}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className={cn("w-4 rounded", themeText)} checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} />
          <span className={cn("text-sm font-bold", themeText)}>Evento Recorrente</span>
        </label>
        
        {formData.isRecurring && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex gap-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-[10px] font-bold transition-all",
                    formData.daysOfWeek.includes(i) ? themeBg + " text-white" : "bg-white text-gray-400 border border-gray-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div>
              <label className={cn("block text-[10px] font-bold uppercase mb-1", themeText)}>Duração (meses)</label>
              <input type="number" min="1" max="12" className="form-input text-sm p-2" value={formData.durationMonths} onChange={e => setFormData({...formData, durationMonths: parseInt(e.target.value)})} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input type="checkbox" className={cn("w-4 rounded", themeText)} checked={formData.autoSchedule} onChange={e => setFormData({...formData, autoSchedule: e.target.checked})} />
              <span className="text-[10px] font-bold text-gray-600 uppercase">Auto-gerar escalas para todas as ocorrências</span>
            </label>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
        <textarea className="form-input" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
      </div>
      <button onClick={() => onSave(formData)} className={cn("w-full text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2", themeBg)}>
        <Save size={20} /> Salvar Evento
      </button>
    </div>
  );
}

function NotificationForm({ users, onSave, theme = 'indigo' }: { users: User[], onSave: (data: any) => void, theme?: string }) {
  const [formData, setFormData] = useState({ userId: 'all', title: '', message: '' });
  const themeBg = {
    imw: "bg-red-600 hover:bg-red-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    red: "bg-red-600 hover:bg-red-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    rose: "bg-rose-900 hover:bg-rose-950",
    sky: "bg-sky-400 hover:bg-sky-500"
  }[theme as keyof typeof themeBg] || "bg-indigo-600";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Para</label>
        <select className="form-input" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})}>
          <option value="all">Todos os Voluntários</option>
          {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
        <input type="text" className="form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mensagem</label>
        <textarea className="form-input" rows={3} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
      </div>
      <button onClick={() => onSave(formData)} className={cn("w-full text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all", themeBg)}><Send size={20} /> Enviar</button>
    </div>
  );
}

function AnnouncementForm({ onSave, theme = 'indigo' }: { onSave: (data: any) => void, theme?: string }) {
  const [formData, setFormData] = useState({ title: '', date: '', time: '', description: '', pdfUrl: '', externalLink: '' });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const themeBg = {
    imw: "bg-red-600 hover:bg-red-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    red: "bg-red-600 hover:bg-red-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    rose: "bg-rose-900 hover:bg-rose-950",
    sky: "bg-sky-400 hover:bg-sky-500"
  }[theme as keyof typeof themeBg] || "bg-indigo-600";

  const themeText = {
    imw: "text-red-700",
    indigo: "text-indigo-700",
    red: "text-red-700",
    blue: "text-blue-700",
    rose: "text-rose-900",
    sky: "text-sky-700"
  }[theme as keyof typeof themeText] || "text-indigo-700";

  const themeBgLight = {
    imw: "bg-red-50",
    indigo: "bg-indigo-50",
    red: "bg-red-50",
    blue: "bg-blue-50",
    rose: "bg-rose-50",
    sky: "bg-sky-50"
  }[theme as keyof typeof themeBgLight] || "bg-indigo-50";

  const handleSave = async () => {
    if (!formData.title || !formData.date) {
      toast.error("Preencha o título e a data.");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    const toastId = toast.loading("Preparando anúncio...");
    
    try {
      let pdfUrl = formData.pdfUrl;
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("O arquivo é muito grande (máximo 10MB)");
        }
        
        toast.loading("Enviando PDF...", { id: toastId });
        console.log("Iniciando upload do arquivo:", file.name);
        
        if (!storage) throw new Error("Firebase Storage não inicializado.");
        
        const storageRef = ref(storage, `announcements/${Date.now()}_${file.name}`);
        
        // Use simpler uploadBytes for better reliability if resumable fails
        try {
          const snapshot = await uploadBytes(storageRef, file);
          console.log("Upload concluído via uploadBytes");
          pdfUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadErr) {
          console.warn("uploadBytes falhou, tentando resumable...", uploadErr);
          
          const uploadTask = uploadBytesResumable(storageRef, file);
          const uploadPromise = new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
                toast.loading(`Enviando PDF... ${Math.round(progress)}%`, { id: toastId });
              }, 
              (error) => reject(error), 
              () => resolve(uploadTask)
            );
          });

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => {
              uploadTask.cancel();
              reject(new Error("Tempo de upload esgotado (5 min)."));
            }, 300000)
          );

          await Promise.race([uploadPromise, timeoutPromise]);
          pdfUrl = await getDownloadURL(storageRef);
        }
        
        console.log("PDF URL gerada:", pdfUrl);
      }
      
      toast.loading("Salvando anúncio...", { id: toastId });
      await onSave({ ...formData, pdfUrl: pdfUrl || formData.externalLink });
      toast.success("Anúncio publicado com sucesso!", { id: toastId });
    } catch (error: any) {
      console.error("Erro detalhado no upload:", error);
      toast.error(error.message || "Erro ao enviar arquivo. Verifique as permissões.", { id: toastId });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <input placeholder="Título" className="form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
      <div className="grid grid-cols-2 gap-4">
        <input type="date" className="form-input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
        <input type="time" className="form-input" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
      </div>
      <textarea placeholder="Descrição" className="form-input" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
      
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Anexar PDF ou Link Externo</label>
        <div className="space-y-2">
          <input 
            type="file" 
            accept=".pdf" 
            className="w-full p-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
          <div className="flex items-center gap-2">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-[10px] font-bold text-gray-400">OU</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>
          <input 
            placeholder="Link do documento (Google Drive, Dropbox, etc)" 
            className="form-input text-sm" 
            value={formData.externalLink} 
            onChange={e => setFormData({...formData, externalLink: e.target.value})} 
          />
        </div>
      </div>

      <button 
        onClick={handleSave} 
        disabled={isUploading}
        className={cn("w-full text-white font-bold py-4 rounded-2xl disabled:opacity-50 transition-all", themeBg)}
      >
        {isUploading ? "Enviando..." : "Publicar Anúncio"}
      </button>
    </div>
  );
}

function VolunteerForm({ initialData, onSave, theme = 'indigo' }: { initialData: User | null, onSave: (data: any) => void, theme?: string }) {
  const [formData, setFormData] = useState({
    displayName: initialData?.displayName || '',
    email: initialData?.email || '',
    role: initialData?.role || 'VOLUNTARIO',
    specialty: initialData?.specialty || '',
    photoURL: initialData?.photoURL || '',
    birthDate: initialData?.birthDate || '',
    phone: initialData?.phone || ''
  });

  const themeBg = {
    imw: "bg-red-600 hover:bg-red-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    red: "bg-red-600 hover:bg-red-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    rose: "bg-rose-900 hover:bg-rose-950",
    sky: "bg-sky-400 hover:bg-sky-500"
  }[theme as keyof typeof themeBg] || "bg-indigo-600";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
        <input type="text" className="form-input" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
        <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL da Foto</label>
        <input type="text" className="form-input" value={formData.photoURL} onChange={e => setFormData({...formData, photoURL: e.target.value})} placeholder="https://..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data de Nascimento</label>
          <input type="date" className="form-input" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp</label>
          <input type="tel" className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(00) 00000-0000" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo</label>
        <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
          <option value="VOLUNTARIO">VOLUNTÁRIO</option>
          <option value="LIDER_II">LÍDER II</option>
          <option value="LIDER_I">LÍDER I</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Especialidade / Funções</label>
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[50px]">
          {ROLES.map(r => {
            const isSelected = formData.specialty?.split(',').map(s => s.trim()).includes(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  const current = formData.specialty ? formData.specialty.split(',').map(s => s.trim()).filter(Boolean) : [];
                  const updated = current.includes(r) 
                    ? current.filter(s => s !== r)
                    : [...current, r];
                  setFormData({ ...formData, specialty: updated.join(', ') });
                }}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-full transition-all border",
                  isSelected 
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                    : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                )}
              >
                {isSelected ? '✓ ' : '+ '} {r}
              </button>
            );
          })}
        </div>
      </div>
      <button onClick={() => onSave(formData)} className={cn("w-full text-white font-bold py-4 rounded-2xl transition-all", themeBg)}>
        {initialData ? "Atualizar" : "Cadastrar"}
      </button>
    </div>
  );
}

const ROLES = ['Som', 'Câmera', 'Projeção', 'Mídia', 'Vídeo', 'Fotos', 'Cantina', 'Doces', 'Iluminação', 'Recepção', 'Café', 'Placas', 'Anúncios', 'Outros'];

function ScaleForm({ event, users, initialScale, onSave, allScales, allEvents, theme = 'indigo' }: { event: ChurchEvent, users: User[], initialScale?: Scale, onSave: (assignments: any[]) => void, allScales: Scale[], allEvents: ChurchEvent[], theme?: string }) {
  const [assignments, setAssignments] = useState<any[]>(initialScale?.assignments || []);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const themeBg = {
    imw: "bg-red-600 hover:bg-red-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    red: "bg-red-600 hover:bg-red-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    rose: "bg-rose-900 hover:bg-rose-950",
    sky: "bg-sky-400 hover:bg-sky-500"
  }[theme as keyof typeof themeBg] || "bg-indigo-600";

  const themeText = {
    imw: "text-red-600",
    indigo: "text-indigo-600",
    red: "text-red-600",
    blue: "text-blue-600",
    rose: "text-rose-900",
    sky: "text-sky-400"
  }[theme as keyof typeof themeText] || "text-indigo-600";

  const themeBgLight = {
    imw: "bg-red-50",
    indigo: "bg-indigo-50",
    red: "bg-red-50",
    blue: "bg-blue-50",
    rose: "bg-rose-50",
    sky: "bg-sky-50"
  }[theme as keyof typeof themeBgLight] || "bg-indigo-50";

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      if (selectedRoles.length >= 4) {
        toast.error("Máximo de 4 funções por voluntário.");
        return;
      }
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const addAssignment = () => {
    if (!selectedUser) return;
    if (selectedRoles.length === 0) {
      toast.error("Selecione pelo menos uma função.");
      return;
    }
    if (assignments.some(a => a.userId === selectedUser)) {
      toast.error("Voluntário já está nesta escala.");
      return;
    }
    setAssignments([...assignments, { userId: selectedUser, roles: selectedRoles }]);
    setSelectedUser('');
    setSelectedRoles([]);
  };

  const autoSchedule = () => {
    const rolesToAssign = ['Som', 'Câmera', 'Projeção', 'Mídia', 'Vídeo', 'Fotos', 'Cantina', 'Doces', 'Iluminação', 'Recepção', 'Café', 'Placas', 'Anúncios'];
    const newAssignments: any[] = [];
    const usedUserIds = new Set<string>();

    const userParticipation: Record<string, number> = {};
    users.forEach(u => {
      userParticipation[u.uid] = allScales.reduce((acc, s) => 
        acc + s.assignments.filter(a => a.userId === u.uid).length, 0
      );
    });

    rolesToAssign.forEach(role => {
      let eligibleUsers = users.filter(u => 
        !usedUserIds.has(u.uid) && 
        (u.specialty?.toLowerCase().includes(role.toLowerCase()))
      );

      if (eligibleUsers.length === 0) {
        eligibleUsers = users.filter(u => !usedUserIds.has(u.uid));
      }

      eligibleUsers.sort((a, b) => (userParticipation[a.uid] || 0) - (userParticipation[b.uid] || 0));

      if (eligibleUsers.length > 0) {
        const selected = eligibleUsers[0];
        newAssignments.push({ userId: selected.uid, roles: [role] });
        usedUserIds.add(selected.uid);
      }
    });

    setAssignments(newAssignments);
    toast.success("Escala sugerida com sucesso!");
  };

  const duplicatePreviousScale = () => {
    const sameTypeEvents = allEvents
      .filter(e => e.type === event.type && e.id !== event.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (sameTypeEvents.length > 0) {
      const prevScale = allScales.find(s => s.eventId === sameTypeEvents[0].id);
      if (prevScale && prevScale.assignments.length > 0) {
        setAssignments(prevScale.assignments);
        toast.success(`Escala copiada de "${sameTypeEvents[0].title}"`);
        return;
      }
    }
    toast.error("Nenhuma escala anterior encontrada para este tipo de evento.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button onClick={autoSchedule} className={cn("flex-1 font-bold py-3 rounded-xl border transition-all flex items-center justify-center gap-2", themeBgLight, themeText, "border-current border-opacity-20")}>
          <Sparkles size={18} /> Sugerir Escala
        </button>
        <button onClick={duplicatePreviousScale} className={cn("flex-1 font-bold py-3 rounded-xl border transition-all flex items-center justify-center gap-2", themeBgLight, themeText, "border-current border-opacity-20")}>
          <Plus size={18} /> Repetir Anterior
        </button>
      </div>

      <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Adicionar Voluntário</p>
        <select className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
          <option value="">Selecionar Voluntário</option>
          {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
        </select>
        
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Funções (Até 4):</p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => toggleRole(role)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                  selectedRoles.includes(role) 
                    ? cn(themeBg, "text-white border-transparent") 
                    : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
                )}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <button onClick={addAssignment} className={cn("w-full text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2", themeBg)}>
          <Plus size={18} /> Adicionar à Escala
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Escala Atual</p>
        {assignments.map((a, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 shadow-inner text-sm">
                {users.find(u => u.uid === a.userId)?.displayName[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{users.find(u => u.uid === a.userId)?.displayName}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(a.roles || [a.role]).map((r: string) => (
                    <span key={r} className="text-[8px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded uppercase tracking-tighter">{r}</span>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setAssignments(assignments.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
          </div>
        ))}
        {assignments.length === 0 && <p className="text-center text-gray-400 text-sm italic py-4">Nenhum voluntário escalado.</p>}
      </div>
      <button onClick={() => onSave(assignments)} className={cn("w-full text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2", themeBg)}>
        <Save size={20} /> Salvar Escala
      </button>
    </div>
  );
}

function CalendarView({ events, scales, allUsers }: { events: ChurchEvent[], scales: Scale[], allUsers: User[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
        <div>
          <h3 className="text-xl font-bold text-gray-900 capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h3>
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Planejamento Mensal</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white bg-white/50 rounded-xl transition-colors shadow-sm"><ChevronLeft size={20} /></button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white bg-white/50 rounded-xl transition-colors shadow-sm"><ChevronRight size={20} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          
          return (
            <div key={i} className={cn(
              "min-h-[140px] p-2 border-r border-b border-gray-50 transition-colors hover:bg-gray-50/50",
              !isCurrentMonth && "opacity-25"
            )}>
              <span className={cn(
                "text-xs font-bold mb-2 block w-6 h-6 flex items-center justify-center rounded-lg",
                isSameDay(day, new Date()) ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-400"
              )}>
                {format(day, 'd')}
              </span>
              <div className="space-y-1.5">
                {dayEvents.map(e => {
                  const scale = scales.find(s => s.eventId === e.id);
                  const volunteers = scale?.assignments.map(a => allUsers.find(u => u.uid === a.userId)?.displayName.split(' ')[0]).filter(Boolean).join(', ');
                  
                  return (
                    <div key={e.id} className={cn(
                      "px-2 py-1.5 rounded-lg text-[9px] font-bold border-l-2 shadow-sm",
                      e.type === 'CULTO' ? "bg-blue-50 text-blue-700 border-blue-600" : 
                      e.type === 'ENSAIO' ? "bg-sky-50 text-sky-700 border-sky-400" : 
                      "bg-rose-50 text-rose-900 border-rose-900"
                    )}>
                      <div className="flex justify-between items-center mb-0.5">
                        <span>{format(new Date(e.date), 'HH:mm')} {e.title}</span>
                      </div>
                      {volunteers && (
                        <div className="text-[7px] text-gray-500 italic border-t border-black/5 pt-0.5 mt-0.5 truncate">
                          Escala: {volunteers}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SetlistView({ setlists, isAdmin, theme }: { setlists: Setlist[], isAdmin: boolean, theme: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  const handleSave = async () => {
    if (!title || !content) {
      toast.error("Título e conteúdo são obrigatórios.");
      return;
    }

    try {
      if (editingSetlist) {
        await updateDoc(doc(db, 'setlists', editingSetlist.id), { title, content, updatedAt: new Date().toISOString() });
        toast.success("Setlist atualizado!");
      } else {
        await addDoc(collection(db, 'setlists'), { title, content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        toast.success("Setlist criado!");
      }
      setIsModalOpen(false);
      setEditingSetlist(null);
      setTitle('');
      setContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'setlists');
    }
  };

  const quillEditor = React.useMemo(() => (
    <ReactQuill theme="snow" value={content} onChange={setContent} />
  ), [content]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Músicas e Louvor</h3>
        {isAdmin && (
          <button 
            onClick={() => { setEditingSetlist(null); setTitle(''); setContent(''); setIsModalOpen(true); }}
            className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg shadow-red-100"
          >
            <Plus size={16} /> Novo Setlist
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {setlists.map(s => (
          <div key={s.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{s.title}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Atualizado em {new Date(s.updatedAt).toLocaleDateString()}</p>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => { setEditingSetlist(s); setTitle(s.title); setContent(s.content); setIsModalOpen(true); }}
                  className="p-2 text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl transition-colors"
                >
                  <Edit size={16} />
                </button>
              )}
            </div>
            <div className="prose prose-sm max-w-none text-gray-600 line-clamp-3" dangerouslySetInnerHTML={{ __html: s.content }} />
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Modal title={editingSetlist ? "Editar Setlist" : "Novo Setlist"} onClose={() => setIsModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título do Setlist</label>
              <input 
                type="text" 
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Culto de Domingo - 15/10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo</label>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {quillEditor}
              </div>
            </div>
            <button 
              onClick={handleSave}
              className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} /> Salvar Setlist
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CronogramaView({ cronogramas, isAdmin, theme }: { cronogramas: Cronograma[], isAdmin: boolean, theme: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCronograma, setEditingCronograma] = useState<Cronograma | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [externalLink, setExternalLink] = useState('');

  const handleSave = async () => {
    if (!title || (!content && !externalLink)) {
      toast.error("Título e (conteúdo ou link) são obrigatórios.");
      return;
    }

    try {
      if (editingCronograma) {
        await updateDoc(doc(db, 'cronogramas', editingCronograma.id), { title, content, externalLink, updatedAt: new Date().toISOString() });
        toast.success("Cronograma atualizado!");
      } else {
        await addDoc(collection(db, 'cronogramas'), { title, content, externalLink, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        toast.success("Cronograma criado!");
      }
      setIsModalOpen(false);
      setEditingCronograma(null);
      setTitle('');
      setContent('');
      setExternalLink('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cronogramas');
    }
  };

  const generatePDF = async (c: Cronograma) => {
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif;">
        <h1 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">${c.title}</h1>
        <div style="margin-top: 20px; line-height: 1.6;">${c.content}</div>
        <div style="margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
          Gerado em ${new Date().toLocaleString()} - IMW Laureano
        </div>
      </div>
    `;
    document.body.appendChild(element);
    
    try {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`cronograma-${c.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF.");
    } finally {
      document.body.removeChild(element);
    }
  };

  const quillEditor = React.useMemo(() => (
    <ReactQuill theme="snow" value={content} onChange={setContent} />
  ), [content]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Cronograma do Culto</h3>
        {isAdmin && (
          <button 
            onClick={() => { setEditingCronograma(null); setTitle(''); setContent(''); setExternalLink(''); setIsModalOpen(true); }}
            className="bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg shadow-blue-100"
          >
            <Plus size={16} /> Novo Cronograma
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {cronogramas.map(c => (
          <div key={c.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{c.title}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Atualizado em {new Date(c.updatedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => generatePDF(c)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
                >
                  <Download size={16} /> PDF
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => { setEditingCronograma(c); setTitle(c.title); setContent(c.content || ''); setExternalLink(c.externalLink || ''); setIsModalOpen(true); }}
                    className="p-2 text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-xl transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                )}
              </div>
            </div>
            {c.content && <div className="prose prose-sm max-w-none text-gray-600 mb-4" dangerouslySetInnerHTML={{ __html: c.content }} />}
            {c.externalLink && (
              <a href={c.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline">
                <ExternalLink size={16} /> Ver Link Externo
              </a>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Modal title={editingCronograma ? "Editar Cronograma" : "Novo Cronograma"} onClose={() => setIsModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título do Cronograma</label>
              <input 
                type="text" 
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Culto da Vitória - 22/10"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo (Opcional se houver link)</label>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {quillEditor}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link Externo (Opcional)</label>
              <input 
                type="text" 
                className="form-input"
                value={externalLink}
                onChange={e => setExternalLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <button 
              onClick={handleSave}
              className="w-full bg-blue-700 text-white font-bold py-4 rounded-2xl hover:bg-blue-800 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} /> Salvar Cronograma
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProfileForm({ user, onSave, theme }: { user: User, onSave: () => void, theme: string }) {
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    birthDate: user.birthDate || '',
    phone: user.phone || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Enviando foto...');

    try {
      const storageRef = ref(storage, `profile_photos/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setFormData(prev => ({ ...prev, photoURL: downloadURL }));
      toast.success('Foto enviada com sucesso!', { id: toastId });
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      toast.error('Erro ao enviar foto.', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.displayName) {
      toast.error("Nome é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        updatedAt: new Date().toISOString()
      });
      toast.success("Perfil atualizado com sucesso!");
      onSave();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-xl overflow-hidden relative group">
          {formData.photoURL ? (
            <img src={formData.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
              {formData.displayName[0]}
            </div>
          )}
          <div 
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="text-white text-xs font-bold">Alterar</span>
          </div>
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sua Foto de Perfil</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handlePhotoUpload} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
          <input 
            type="text" 
            className="form-input"
            value={formData.displayName}
            onChange={e => setFormData({...formData, displayName: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data de Nascimento</label>
            <input 
              type="date" 
              className="form-input"
              value={formData.birthDate}
              onChange={e => setFormData({...formData, birthDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp</label>
            <input 
              type="tel" 
              className="form-input"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={isSaving || uploading}
        className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isSaving ? "Salvando..." : <><Save size={20} /> Salvar Alterações</>}
      </button>
    </div>
  );
}
