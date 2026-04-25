import * as React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  getDocs,
  getDocFromServer,
  arrayUnion,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType, storage, messaging } from "./firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable,
} from "firebase/storage";
import { useAuth } from "./contexts/AuthContext";
import {
  ChurchEvent,
  Scale,
  User,
  CheckIn,
  Notification as AppNotification,
  Announcement,
  Reaction,
  Setlist,
  Cronograma,
} from "./types";
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
  ArrowLeft,
  X,
  Save,
  Send,
  Heart,
  ThumbsUp,
  Smile,
  MessageSquare,
  Download,
  ExternalLink,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
  Camera,
  Palette,
  ShieldCheck,
} from "lucide-react";

const ChristianCross = ({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 3v18" />
    <path d="M8 8h8" />
  </svg>
);
import { formatDate, cn } from "./lib/utils";
import { parseCommand } from "./services/aiService";
import { Toaster, toast } from "sonner";
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
} from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import MaintenanceCenter from "./components/MaintenanceCenter";
import EventComments from "./components/EventComments";

export default function App() {
  const { user, loading, login, logout, isAdmin, isCoordinator } = useAuth();
  
  const isSuperAdmin = Boolean(
    user?.email && 
    ['midiaimwlaureano@gmail.com', 'thatianebusiness@gmail.com', 'melolucas78@gmail.com'].includes(user.email)
  );

  const canSeeMaintenanceAndNotifications = isAdmin || user?.role === 'LIDER_II' || user?.role === 'ADMIN' || isSuperAdmin;

  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname.substring(1);
    if (path === "manutencao") return "maintenance";
    if (["calendar", "events", "scales", "volunteers", "announcements", "setlist", "cronograma", "notifications", "maintenance"].includes(path)) {
      return path;
    }
    return "dashboard";
  });

  const isPoppingState = React.useRef(false);

  useEffect(() => {
    if (isPoppingState.current) {
      isPoppingState.current = false;
      return;
    }
    if (activeTab === "maintenance") {
      window.history.pushState({ tab: activeTab }, "", "/manutencao");
    } else if (activeTab === "dashboard") {
      window.history.pushState({ tab: activeTab }, "", "/");
    } else {
      window.history.pushState({ tab: activeTab }, "", `/${activeTab}`);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Allow browser back button to naturally navigate
      isPoppingState.current = true;
      const path = window.location.pathname.substring(1);
      if (path === "manutencao") {
        setActiveTab("maintenance");
      } else if (["calendar", "events", "scales", "volunteers", "announcements", "setlist", "cronograma", "notifications", "maintenance"].includes(path)) {
        setActiveTab(path as any);
      } else {
        setActiveTab("dashboard");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"modern" | "compact">(() => {
    const val = localStorage.getItem("layoutMode");
    return (val === "modern" || val === "compact" ? val : "modern");
  });
  const [navStyle, setNavStyle] = useState<"sidebar" | "top">(() => {
    const val = localStorage.getItem("navStyle");
    return (val === "sidebar" || val === "top" ? val : "sidebar");
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<
    "electric_blue" | "emerald" | "neon_purple" | "sunset_orange" | "hot_pink" | "carmine_red" | "cyan" | "sunflower_yellow"
  >(() => (localStorage.getItem("theme") as any) || "electric_blue");
  const [visualTheme, setVisualTheme] = useState<"claro" | "escuro" | "vidro">(() => (localStorage.getItem("visualTheme") as any) || (localStorage.getItem("isDarkMode") === "true" ? "escuro" : "claro"));
  const isDarkMode = visualTheme === "escuro" || visualTheme === "vidro";

  useEffect(() => {
    localStorage.setItem("theme", theme);
    const themeColors: Record<string, string> = {
      electric_blue: "#3b82f6",
      emerald: "#10b981",
      neon_purple: "#a855f7",
      sunset_orange: "#f97316",
      hot_pink: "#ec4899",
      carmine_red: "#ef4444",
      cyan: "#06b6d4",
      sunflower_yellow: "#eab308",
    };
    const root = document.documentElement;
    const color = themeColors[theme] || themeColors.electric_blue;
    root.style.setProperty('--cor-principal', color);
    
    // For hover versions
    // To support opacity correctly, we need rgb variables. But for simplicity we can use hex + alpha
    // 33 is 20% opacity in hex
    root.style.setProperty('--cor-principal-faded', `${color}33`);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("visualTheme", visualTheme);
    localStorage.setItem("isDarkMode", String(isDarkMode));
    
    document.documentElement.classList.remove("dark", "glass");
    
    if (visualTheme === "vidro") {
      document.documentElement.classList.add("dark", "glass");
    } else if (visualTheme === "escuro") {
      document.documentElement.classList.add("dark");
    }
  }, [visualTheme, isDarkMode]);

  useEffect(() => {
    localStorage.setItem("layoutMode", layoutMode);
    localStorage.setItem("navStyle", navStyle);
  }, [layoutMode, navStyle]);

  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [scales, setScales] = useState<Scale[]>([]);
  const [scaleFilterVolunteer, setScaleFilterVolunteer] =
    useState<string>("all");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [cronogramas, setCronogramas] = useState<Cronograma[]>([]);
  const [aiCommand, setAiCommand] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<User | null>(null);
  const [selectedEventForScale, setSelectedEventForScale] =
    useState<ChurchEvent | null>(null);
  const [viewingSetlist, setViewingSetlist] = useState<Setlist | null>(null);
  const [viewingCronograma, setViewingCronograma] = useState<Cronograma | null>(null);
  const [isDateScheduleModalOpen, setIsDateScheduleModalOpen] = useState(false);
  const [dateScheduleUser, setDateScheduleUser] = useState("");
  const [localPushEnabled, setLocalPushEnabled] = useState(user?.pushEnabled ?? false);

  useEffect(() => {
    setLocalPushEnabled(user?.pushEnabled ?? false);
  }, [user?.pushEnabled]);
  const [dateScheduleRole, setDateScheduleRole] = useState("");
  const [dateScheduleEvents, setDateScheduleEvents] = useState<string[]>([]);

  // New Filters
  const [eventFilterType, setEventFilterType] = useState('all');
  const [eventFilterStatus, setEventFilterStatus] = useState('all');
  const [scaleFilterRole, setScaleFilterRole] = useState('all');
  const [scaleViewMode, setScaleViewMode] = useState<'cards' | 'weekly'>('cards');
  const [calendarFilterType, setCalendarFilterType] = useState('all');
  const [calendarFilterStatus, setCalendarFilterStatus] = useState('all');

  // Static Data - Fetched once to save Quotas
  useEffect(() => {
    if (!user) return;

    const fetchStaticData = async () => {
      try {
        const snapUsers = await getDocs(collection(db, "users"));
        setAllUsers(snapUsers.docs.map((doc) => ({ uid: doc.id, ...doc.data() }) as User));

        const snapCheckins = await getDocs(collection(db, "checkins"));
        setCheckins(snapCheckins.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CheckIn));

        const snapReactions = await getDocs(collection(db, "reactions"));
        setReactions(snapReactions.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Reaction));
      } catch (err) {
        console.error("Error fetching static data: ", err);
      }
    };
    fetchStaticData();
  }, [user]);

  // Global Real-time listeners
  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];

    // 1. Events
    const qEvents = query(collection(db, "events"), orderBy("date", "asc"));
    unsubscribers.push(onSnapshot(qEvents, (snapshot) => {
      setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ChurchEvent));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "events")));

    // 2. Scales
    unsubscribers.push(onSnapshot(collection(db, "scales"), (snapshot) => {
      setScales(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Scale));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "scales")));

    // 3. Notifications
    const qNotifs = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20),
    );
    unsubscribers.push(onSnapshot(qNotifs, (snapshot) => {
      let shownNotifs: string[] = [];
      try {
        shownNotifs = JSON.parse(localStorage.getItem('shown_notifs_imw') || '[]');
      } catch(e) {}
      
      let shouldUpdateStorage = false;

      snapshot.docChanges().forEach((change) => {
         if (change.type === "added") {
            const notifData = change.doc.data() as AppNotification;
            
            if (!shownNotifs.includes(change.doc.id) && user.pushEnabled) {
               if ("Notification" in window && Notification.permission === "granted") {
                  new Notification(notifData.title, { body: notifData.message, icon: '/favicon.svg', tag: 'lembrete-evento', requireInteraction: true });
               }
               shownNotifs.push(change.doc.id);
               shouldUpdateStorage = true;
            }
         }
      });
      
      if (shouldUpdateStorage) {
        if (shownNotifs.length > 50) shownNotifs = shownNotifs.slice(shownNotifs.length - 50);
        localStorage.setItem('shown_notifs_imw', JSON.stringify(shownNotifs));
      }

      setNotifications(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AppNotification));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "notifications")));

    // 4. Announcements
    const qAnnouncements = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    unsubscribers.push(onSnapshot(qAnnouncements, (snapshot) => {
      let shownNotifs: string[] = [];
      try {
        shownNotifs = JSON.parse(localStorage.getItem('shown_ann_imw') || '[]');
      } catch(e) {}
      
      let shouldUpdateStorage = false;

      snapshot.docChanges().forEach((change) => {
         if (change.type === "added") {
            const annData = change.doc.data() as Announcement;
            if (!shownNotifs.includes(change.doc.id) && user.pushEnabled) {
               if ("Notification" in window && Notification.permission === "granted") {
                  new Notification(annData.title, { body: annData.description, icon: '/favicon.svg', tag: 'lembrete-evento', requireInteraction: true });
               }
               shownNotifs.push(change.doc.id);
               shouldUpdateStorage = true;
            }
         }
      });

      if (shouldUpdateStorage) {
        if (shownNotifs.length > 50) shownNotifs = shownNotifs.slice(shownNotifs.length - 50);
        localStorage.setItem('shown_ann_imw', JSON.stringify(shownNotifs));
      }

      setAnnouncements(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Announcement));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "announcements")));

    // 5. Setlists
    unsubscribers.push(onSnapshot(collection(db, "setlists"), (snapshot) => {
      setSetlists(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Setlist));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "setlists")));

    // 6. Cronogramas
    unsubscribers.push(onSnapshot(collection(db, "cronogramas"), (snapshot) => {
      setCronogramas(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Cronograma));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "cronogramas")));

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user]);

  // Automatic Event Status Update and Birthday Notifications
  useEffect(() => {
    if (!isAdmin || !allUsers.length) return;

    const performDailyChecks = async () => {
      // 1. Update past events
      if (events.length > 0) {
        const now = new Date();
        const pastEvents = events.filter(
          (e) => e.status !== "CONCLUIDO" && new Date(e.date) < now,
        );

        for (const event of pastEvents) {
          try {
            await updateDoc(doc(db, "events", event.id), { status: "CONCLUIDO" });
          } catch (error) {
            console.error("Error updating event status:", error);
          }
        }
      }

      // 2. Check for upcoming birthdays (within 7 days) and notify
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      allUsers.forEach(async (u) => {
        if (!u.birthDate) return;
        const [year, month, day] = u.birthDate.split('-');
        let nextBday = new Date(today.getFullYear(), parseInt(month) - 1, parseInt(day));
        
        // If birthday already passed this year, check next year
        if (nextBday < today) {
          nextBday = new Date(today.getFullYear() + 1, parseInt(month) - 1, parseInt(day));
        }

        const timeDiff = nextBday.getTime() - today.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysUntil === 7 || daysUntil === 1 || daysUntil === 0) {
          const notificationTitle = `Aniversário: ${u.displayName.split(' ')[0]}`;
          const notificationMessage = daysUntil === 0 
            ? `Hoje é o aniversário de ${u.displayName}! 🎉` 
            : `Faltam ${daysUntil} dias para o aniversário de ${u.displayName}.`;
          
          const notifIdString = `bday_${u.uid}_${nextBday.getFullYear()}_${daysUntil}`;
          
          // Check if we already sent this specific notification
          // A somewhat hacky way is to query if it exists for the current user (the admin who is running this)
          // To avoid massive reads, we rely on a custom ID hash or just check local state temporarily
          const notifRef = doc(db, "notifications", notifIdString);
          try {
            const docSnap = await getDocFromServer(notifRef);
            if (!docSnap.exists()) {
              await setDoc(notifRef, {
                userId: "all", // "all" means broadcast or we create individual ones
                // To keep it simple, we store it for the admin or everyone.
                // Or better, let's just create a general announcement/notification.
                // We'll create it for the admin only first, but user asked for "voluntários e administradores".
                // So let's create a broadcast notification by checking if it exists first.
              });
              
              // We'll use the existing notifications collection but broadcast it or addDoc for each.
              // Actually, "userId: 'all'" might not work with our query `where("userId", "==", user.uid)`
              // Let's create it for everyone.
              const batch = [];
              for(const appUser of allUsers) {
                 batch.push(
                    addDoc(collection(db, "notifications"), {
                      userId: appUser.uid,
                      title: notificationTitle,
                      message: notificationMessage,
                      read: false,
                      createdAt: new Date().toISOString(),
                    })
                 );
              }
              await Promise.all(batch);
            }
          } catch(err) {
             console.error("Failed to process birthday notification", err);
          }
        }
      });

      // 3. Event Reminder - 24h before
      if (events.length > 0) {
        const now = new Date();
        const upcomingEvents = events.filter((e) => {
           if ((e as any).reminderSent) return false;
           const eventDate = new Date(e.date);
           const diff = eventDate.getTime() - now.getTime();
           // within next 24 hours and not passed
           return diff > 0 && diff <= 24 * 60 * 60 * 1000;
        });

        for (const e of upcomingEvents) {
           try {
             const scale = scales.find(s => s.eventId === e.id);
             if (scale && scale.assignments.length > 0) {
                const batch = [];
                const assignedUsers = Array.from(new Set(scale.assignments.map(a => a.userId).filter(id => id && id !== "EMPTY")));
                for(const uid of assignedUsers) {
                   batch.push(
                      addDoc(collection(db, "notifications"), {
                        userId: uid,
                        title: `Lembrete: Escala Amanhã!`,
                        message: `Você está escalado(a) para o evento: ${e.title}. Contamos com você!`,
                        read: false,
                        createdAt: new Date().toISOString(),
                      })
                   );
                }
                if (batch.length > 0) {
                  await Promise.all(batch);
                }
                await updateDoc(doc(db, "events", e.id), { reminderSent: true });
             }
           } catch(err) {
              console.error("Failed to send 24h reminder", err);
           }
        }
      }
    };

    performDailyChecks();
    // Check every hour to see if day changed or perform past event updates
    const interval = setInterval(performDailyChecks, 1000 * 60 * 60); 
    return () => clearInterval(interval);
  }, [events, allUsers, isAdmin]);
  const performAutoSchedule = async (
    eventId: string,
    currentScales: Scale[],
    currentUsers: User[],
  ) => {
    const roles = [
      "Som",
      "Câmera",
      "Projeção",
      "Mídia",
      "Vídeo",
      "Fotos",
      "Cantina",
      "Doces",
      "Iluminação",
      "Recepção",
      "Café",
      "Placas",
      "Anúncios",
    ];
    const newAssignments: any[] = [];
    const usedUserIds = new Set<string>();

    // Get existing scale for this event to preserve manual assignments
    const scaleRef = collection(db, "scales");
    const q = query(scaleRef, where("eventId", "==", eventId));
    const snap = await getDocs(q);
    const existingAssignments = snap.empty
      ? []
      : snap.docs[0].data().assignments || [];

    // Pre-populate with existing manual assignments (where userId is an actual user)
    existingAssignments.forEach((a: any) => {
      if (a.userId && a.userId !== "EMPTY") {
        newAssignments.push(a);
        usedUserIds.add(a.userId);
      }
    });

    const userParticipation: Record<string, number> = {};
    currentUsers.forEach((u) => {
      userParticipation[u.uid] = currentScales.reduce(
        (acc, s) =>
          acc + s.assignments.filter((a) => a.userId === u.uid).length,
        0,
      );
    });

    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent) return;

    const eventDate = new Date(targetEvent.date);
    const eventDayOfWeek = eventDate.getDay();
    const eventMonth = eventDate.getMonth();
    const eventYear = eventDate.getFullYear();

    const normalizeString = (str: string) => {
      return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    };

    const activeRoles = roles.filter((role) => 
      currentUsers.some((u) => u.status === "approved" && normalizeString(u.specialty || "").includes(normalizeString(role)))
    );

    // Calculate scales per month per user
    const userScalesThisMonth = new Map<string, number>();
    currentScales.forEach((scale) => {
      const scaleEvent = events.find((e) => e.id === scale.eventId);
      if (scaleEvent) {
        const sDate = new Date(scaleEvent.date);
        if (sDate.getMonth() === eventMonth && sDate.getFullYear() === eventYear) {
          scale.assignments.forEach((a) => {
            if (a.userId) {
              userScalesThisMonth.set(a.userId, (userScalesThisMonth.get(a.userId) || 0) + 1);
            }
          });
        }
      }
    });

    activeRoles.forEach((role) => {
      // Skip if this role is already assigned manually
      if (
        newAssignments.some(
          (a) => (a.roles || []).includes(role) || a.role === role,
        )
      ) {
        return;
      }

      let eligibleUsers = currentUsers.filter(
        (u) => {
          if (u.status !== "approved" || usedUserIds.has(u.uid)) return false;
          if (!normalizeString(u.specialty || "").includes(normalizeString(role))) return false;
          
          // Check day of week availability
          if (u.availableDays && u.availableDays.length > 0 && !u.availableDays.includes(eventDayOfWeek)) {
            return false;
          }

          // Check max scales per month
          if (u.maxScalesPerMonth && u.maxScalesPerMonth > 0) {
            const usedThisMonth = userScalesThisMonth.get(u.uid) || 0;
            if (usedThisMonth >= u.maxScalesPerMonth) {
              return false;
            }
          }

          return true;
        }
      );

      if (eligibleUsers.length > 0) {
        // Sort to spread out assignments and avoid consecutive fatigue
        eligibleUsers.sort((a, b) => {
          // 1. By total participation
          const diff =
            (userParticipation[a.uid] || 0) - (userParticipation[b.uid] || 0);
          if (diff !== 0) return diff;
          
          // 2. By scales this month
          const scalesA = userScalesThisMonth.get(a.uid) || 0;
          const scalesB = userScalesThisMonth.get(b.uid) || 0;
          if (scalesA !== scalesB) return scalesA - scalesB;

          return Math.random() - 0.5;
        });

        const selected = eligibleUsers[0];
        newAssignments.push({ userId: selected.uid, roles: [role] });
        usedUserIds.add(selected.uid);
        userScalesThisMonth.set(selected.uid, (userScalesThisMonth.get(selected.uid) || 0) + 1);
      }
    });

    if (!snap.empty) {
      await updateDoc(doc(db, "scales", snap.docs[0].id), {
        assignments: newAssignments,
      });
    } else {
      await addDoc(collection(db, "scales"), {
        eventId,
        assignments: newAssignments,
      });
    }
  };

  const generateRecurringEvents = async (
    baseEvent: any,
    durationMonths: number = 3,
    autoSchedule: boolean = false,
  ) => {
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
          createdAt: new Date().toISOString(),
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const ev of eventsToCreate) {
      const docRef = await addDoc(collection(db, "events"), ev);
      if (autoSchedule) {
        // Run AI assignment logic purely local without fetching, then add directly
        const roles = ["Som", "Câmera", "Projeção", "Mídia", "Vídeo", "Fotos", "Cantina", "Doces", "Iluminação", "Recepção", "Café", "Placas", "Anúncios"];
        const newAssignments: any[] = [];
        const usedUserIds = new Set<string>();
        
        const eventDate = new Date(ev.date);
        const eventDayOfWeek = eventDate.getDay();
        
        roles.forEach((role) => {
          let eligibleUsers = allUsers.filter(u => {
            if (u.status !== "approved" || usedUserIds.has(u.uid)) return false;
            
            const normalizedSpecialty = u.specialty ? u.specialty.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
            const normalizedRole = role.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            if (!normalizedSpecialty.includes(normalizedRole)) return false;
            
            if (u.availableDays && u.availableDays.length > 0 && !u.availableDays.includes(eventDayOfWeek)) {
              return false;
            }
            return true;
          });

          if (eligibleUsers.length > 0) {
            eligibleUsers.sort(() => Math.random() - 0.5); // Fast randomization instead of complex fatigue
            const selected = eligibleUsers[0];
            newAssignments.push({ userId: selected.uid, roles: [role] });
            usedUserIds.add(selected.uid);
          }
        });
        
        await addDoc(collection(db, "scales"), {
          eventId: docRef.id,
          assignments: newAssignments,
        });
      } else {
        await addDoc(collection(db, "scales"), {
          eventId: docRef.id,
          assignments: [],
        });
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
        date: new Date(
          new Date(event.date).getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // +1 week
        createdAt: new Date().toISOString(),
      };
      delete (newEvent as any).id;
      const docRef = await addDoc(collection(db, "events"), newEvent);

      // Also duplicate scale if it exists
      const existingScale = scales.find((s) => s.eventId === event.id);
      if (existingScale) {
        await addDoc(collection(db, "scales"), {
          eventId: docRef.id,
          assignments: existingScale.assignments,
        });
      } else {
        await addDoc(collection(db, "scales"), {
          eventId: docRef.id,
          assignments: [],
        });
      }

      toast.success("Evento duplicado para a próxima semana!", { id: toastId });
    } catch (error) {
      toast.error("Erro ao duplicar evento.", { id: toastId });
    }
  };

  const handleReaction = async (targetId: string, emoji: string) => {
    if (!user) return;

    const existingReaction = reactions.find(
      (r) =>
        r.targetId === targetId && r.userId === user.uid && r.emoji === emoji,
    );

    if (existingReaction) {
      await deleteDoc(doc(db, "reactions", existingReaction.id));
    } else {
      await addDoc(collection(db, "reactions"), {
        targetId,
        userId: user.uid,
        emoji,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleBatchGenerateScales = async () => {
    const toastId = toast.loading("Gerando escalas para eventos futuros...");
    try {
      const futureEvents = events.filter((e) => new Date(e.date) > new Date());
      let count = 0;

      for (const event of futureEvents) {
        const scale = scales.find((s) => s.eventId === event.id);
        if (!scale || scale.assignments.length === 0) {
          await performAutoSchedule(event.id, scales, allUsers);
          count++;
        }
      }
      toast.success(`${count} escalas geradas automaticamente!`, {
        id: toastId,
      });
    } catch (error) {
      toast.error("Erro ao gerar escalas em lote.", { id: toastId });
    }
  };

  const handleDateScheduleSave = async () => {
    if (
      !dateScheduleUser ||
      !dateScheduleRole ||
      dateScheduleEvents.length === 0
    ) {
      toast.error("Preencha todos os campos e selecione pelo menos um evento.");
      return;
    }

    const toastId = toast.loading("Agendando voluntário...");
    try {
      for (const eventId of dateScheduleEvents) {
        const scaleRef = collection(db, "scales");
        const q = query(scaleRef, where("eventId", "==", eventId));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docId = snap.docs[0].id;
          const currentScale = snap.docs[0].data() as Scale;
          // Check if already in scale
          if (
            !currentScale.assignments.some((a) => a.userId === dateScheduleUser)
          ) {
            const newAssignments = [
              ...currentScale.assignments,
              { userId: dateScheduleUser, roles: [dateScheduleRole] },
            ];
            await updateDoc(doc(db, "scales", docId), {
              assignments: newAssignments,
            });
          }
        } else {
          await addDoc(collection(db, "scales"), {
            eventId,
            assignments: [
              { userId: dateScheduleUser, roles: [dateScheduleRole] },
            ],
          });
        }
      }
      toast.success("Voluntário agendado com sucesso!", { id: toastId });
      setIsDateScheduleModalOpen(false);
      setDateScheduleUser("");
      setDateScheduleRole("");
      setDateScheduleEvents([]);
    } catch (error) {
      toast.error("Erro ao agendar voluntário.", { id: toastId });
    }
  };

  const handleAiCommand = async () => {
    if (!aiCommand.trim()) return;
    setIsAiLoading(true);
    const toastId = toast.loading("Processando comando...");
    try {
      const result = await parseCommand(aiCommand);

      if (result.action === "CREATE_EVENT") {
        const eventData = {
          ...result.event,
          createdBy: user?.uid,
          createdAt: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, "events"), eventData);
        await addDoc(collection(db, "scales"), {
          eventId: docRef.id,
          assignments: [],
        });

        if (result.event.isRecurring) {
          const count = await generateRecurringEvents(
            eventData,
            result.event.durationMonths || 3,
          );
          toast.success(
            `Evento "${result.event.title}" e mais ${count} ocorrências criadas!`,
            { id: toastId },
          );
        } else {
          toast.success(`Evento "${result.event.title}" criado!`, {
            id: toastId,
          });
        }
      } else if (result.action === "CREATE_VOLUNTEER") {
        const newUser = {
          ...result.volunteer,
          createdAt: new Date().toISOString(),
          color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        };
        await addDoc(collection(db, "users"), newUser);
        toast.success(
          `Voluntário "${result.volunteer.displayName}" cadastrado!`,
          { id: toastId },
        );
      } else if (result.action === "CREATE_NOTIFICATION") {
        const targetUsers = result.notification.targetUserEmail
          ? allUsers.filter(
              (u) => u.email === result.notification.targetUserEmail,
            )
          : allUsers;

        for (const u of targetUsers) {
          await addDoc(collection(db, "notifications"), {
            userId: u.uid,
            title: result.notification.title,
            message: result.notification.message,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
        toast.success("Notificações enviadas!", { id: toastId });
      } else if (result.action === "CREATE_ANNOUNCEMENT") {
        await addDoc(collection(db, "announcements"), {
          ...result.announcement,
          createdAt: new Date().toISOString(),
        });
        toast.success(`Anúncio "${result.announcement.title}" criado!`, {
          id: toastId,
        });
      }
      setAiCommand("");
    } catch (error) {
      console.error("Erro no comando IA:", error);
      toast.error("Erro ao processar comando. Tente ser mais específico.", {
        id: toastId,
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCheckIn = async (
    eventId: string,
    status: "PRESENTE" | "AUSENTE" | "ATRASADO",
  ) => {
    try {
      const existing = checkins.find(
        (c) => c.eventId === eventId && c.userId === user?.uid,
      );
      if (existing) {
        await updateDoc(doc(db, "checkins", existing.id), {
          status,
          timestamp: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, "checkins"), {
          eventId,
          userId: user?.uid,
          status,
          timestamp: new Date().toISOString(),
        });
      }
      toast.success("Check-in realizado!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "checkins");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteDoc(doc(db, "events", eventId));
      toast.success("Evento excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
      handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`);
    }
  };

  const handleExportWeeklyScale = async () => {
    const tableElement = document.getElementById("scales-weekly-table");
    if (!tableElement) {
      toast.error("Tabela não encontrada. Mude para 'Resumo Semanal' primeiro.");
      return;
    }
    
    toast.info("Gerando PDF, aguarde...");
    try {
      const element = document.createElement("div");
      element.innerHTML = `
        <div style="background-color: #ffffff; color: #000000; font-family: Arial, Helvetica, sans-serif; padding: 10mm; width: 297mm; box-sizing: border-box;">
          <h1 style="color: #000000; font-size: 16pt; font-weight: bold; margin-bottom: 24px; text-align: center;">Escala Semanal</h1>
          <div id="pdf-table-container"></div>
          <div style="margin-top: 40px; font-size: 10pt; color: #000000; border-top: 1px solid #000000; padding-top: 10px; text-align: center;">
            Gerado em ${new Date().toLocaleString('pt-BR')} - IMW Laureano
          </div>
        </div>
      `;
      
      const clonedTable = tableElement.cloneNode(true) as HTMLElement;
      
      const styleSheet = document.createElement("style");
      styleSheet.innerText = `
        #pdf-table-container table { width: 100%; border-collapse: collapse; background-color: #ffffff !important; }
        #pdf-table-container th, #pdf-table-container td { border-bottom: 1px solid #e5e7eb !important; padding: 12px 16px !important; color: #000000 !important; background-color: #ffffff !important; font-family: Arial, Helvetica, sans-serif !important; }
        #pdf-table-container th { font-weight: bold !important; text-transform: uppercase !important; font-size: 12px !important; }
        #pdf-table-container td { font-size: 14px !important; }
        #pdf-table-container * { color: #000000 !important; border-color: #e5e7eb !important; background-color: transparent !important; }
        #pdf-table-container th:last-child, #pdf-table-container td:last-child { display: none !important; }
      `;
      
      element.querySelector("#pdf-table-container")?.appendChild(clonedTable);
      element.appendChild(styleSheet);
      
      Object.assign(element.style, {
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        backgroundColor: '#ffffff'
      });
      document.body.appendChild(element);

      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      
      // Calculate layout
      const pdf = new jsPDF("l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`escala-semanal-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF da escala", error);
      toast.error("Erro ao gerar PDF.");
    } finally {
      // Clean up the temporary element
      const el = document.getElementById("pdf-table-container")?.parentElement?.parentElement;
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-600 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3">
            <CalendarIcon size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Mídia Igreja
          </h1>
          <button
            onClick={login}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
          >
            <UserIcon size={20} /> Entrar com Google
          </button>
        </div>
      </div>
    );

  if (user.status === "pending") {
    const isProfileComplete = user.phone && user.specialty && user.birthDate;

    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Aprovação Pendente
          </h2>
          {isProfileComplete ? (
            <div className="space-y-6">
              <div className="bg-green-50 text-green-700 p-4 rounded-2xl border border-green-100 text-sm">
                <strong>Perfil completo! 🎉</strong><br/>
                Seus dados foram enviados e estão sob análise da liderança. 
                Você receberá acesso total assim que for aprovado.
              </div>
              <button
                onClick={logout}
                className="w-full font-bold py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Voltar ao Início
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-8 text-sm">
                Sua conta foi criada! Para liberar seu acesso, por favor,
                complete seu perfil (telefone, data de nascimento e funções) abaixo.
              </p>
              <ProfileForm
                user={user}
                onSave={() =>
                  toast.success("Perfil atualizado! Aguarde a aprovação da liderança.")
                }
                theme={theme}
              />
              <button
                onClick={logout}
                className="mt-6 text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Sair e tentar com outra conta
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen flex transition-colors duration-300",
        isDarkMode
          ? "bg-slate-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-sky-50",
        navStyle === "top" ? "flex-col" : "flex-col md:flex-row",
      )}
    >
      <Toaster position="top-right" theme={isDarkMode ? "dark" : "light"} />

      {/* Sidebar / Top Nav */}
      <aside
        className={cn(
          "bg-white border-gray-200 z-20 transition-all shrink-0 glass",
          navStyle === "sidebar"
            ? isSidebarCollapsed
              ? "w-full md:w-20 md:border-r border-b flex flex-col md:sticky md:top-0 md:h-screen"
              : "w-full md:w-64 md:border-r border-b flex flex-col md:sticky md:top-0 md:h-screen"
            : "w-full border-b flex flex-row items-center justify-between px-4 md:px-8 py-4 sticky top-0",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between",
            navStyle === "sidebar" ? "border-b border-gray-100 p-4 md:p-6" : "",
          )}
        >
          <button
            onClick={() => setActiveTab("dashboard")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
              <ChristianCross size={20} />
            </div>
            <div
              className={cn(
                navStyle === "sidebar"
                  ? "block text-left"
                  : "hidden sm:block text-left",
                navStyle === "sidebar" && isSidebarCollapsed ? "md:hidden" : "",
              )}
            >
              <h1 className="text-lg font-black text-gray-900 leading-none">
                MÍDIA IMW
              </h1>
              <p className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase">
                Laureano
              </p>
            </div>
          </button>

          {/* Mobile Profile Button */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="md:hidden w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden shrink-0"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              user.displayName[0]
            )}
          </button>
        </div>

        <nav
          className={cn(
            "flex gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar",
            navStyle === "sidebar"
              ? "flex-row md:flex-col p-4 flex-none md:flex-1 min-h-0"
              : "flex-row items-center px-4 min-h-0",
          )}
        >
          <NavItem
            active={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            compact={navStyle === "top" || isSidebarCollapsed}
            theme={theme}
          />
          <NavItem
            active={activeTab === "calendar"}
            onClick={() => setActiveTab("calendar")}
            icon={<CalendarDays size={20} />}
            label="Calendário"
            compact={navStyle === "top" || isSidebarCollapsed}
            theme={theme}
          />
          <NavItem
            active={activeTab === "events"}
            onClick={() => setActiveTab("events")}
            icon={<CalendarIcon size={20} />}
            label="Eventos"
            compact={navStyle === "top" || isSidebarCollapsed}
            theme={theme}
          />
          <NavItem
            active={activeTab === "scales"}
            onClick={() => setActiveTab("scales")}
            icon={<Clock size={20} />}
            label="Escalas"
            compact={navStyle === "top" || isSidebarCollapsed}
            theme={theme}
          />
          <NavItem
            active={activeTab === "volunteers"}
            onClick={() => setActiveTab("volunteers")}
            icon={<Users size={20} />}
            label="Voluntários"
            compact={navStyle === "top" || isSidebarCollapsed}
            theme={theme}
          />
          <NavItem
            active={activeTab === "announcements"}
            onClick={() => setActiveTab("announcements")}
            icon={<Megaphone size={20} />}
            label="Anúncios"
            compact={navStyle === "top" || isSidebarCollapsed}
            theme={theme}
          />
          <NavItem
            active={activeTab === "setlist"}
            onClick={() => setActiveTab("setlist")}
            icon={<FileText size={20} />}
            label="Setlist"
            compact={navStyle === "top" || isSidebarCollapsed}
            theme={theme}
          />
          <NavItem
            active={activeTab === "cronograma"}
            onClick={() => setActiveTab("cronograma")}
            icon={<CalendarIcon size={20} />}
            label="Cronograma"
            compact={navStyle === "top" || isSidebarCollapsed}
            theme={theme}
          />
          {canSeeMaintenanceAndNotifications && (
            <>
              <NavItem
                active={activeTab === "maintenance"}
                onClick={() => setActiveTab("maintenance")}
                icon={<ShieldCheck size={20} />}
                label="Manutenção"
                compact={navStyle === "top" || isSidebarCollapsed}
                theme={theme}
              />
              <NavItem
                active={activeTab === "notifications"}
                onClick={() => setActiveTab("notifications")}
                icon={<Bell size={20} />}
                label="Notificações"
                compact={navStyle === "top" || isSidebarCollapsed}
                theme={theme}
              />
            </>
          )}
        </nav>

        <div
          className={cn(
            "border-t border-gray-100 hidden md:flex",
            navStyle === "sidebar"
              ? "p-4 flex-col"
              : "p-0 ml-4 items-center gap-4",
          )}
        >
          {navStyle === "sidebar" && (
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="flex items-center justify-center gap-3 w-full p-3 text-gray-500 hover:bg-gray-100 rounded-xl mb-4 transition-colors"
              title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen size={20} />
              ) : (
                <PanelLeftClose size={20} />
              )}
              {!isSidebarCollapsed && (
                <span className="font-medium text-sm">Recolher</span>
              )}
            </button>
          )}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className={cn(
              "flex items-center gap-3 transition-all",
              navStyle === "sidebar"
                ? "w-full p-3 bg-gray-50 rounded-2xl mb-4 hover:bg-gray-100"
                : "p-2 hover:bg-gray-50 rounded-xl",
            )}
          >
            <div 
               className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden shrink-0 text-sm"
               style={{ backgroundColor: user.photoURL ? 'transparent' : user.bg_color || user.color || '#4F46E5', color: user.photoURL ? 'inherit' : 'white' }}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : user.profile_emoji ? (
                user.profile_emoji
              ) : (
                user.initials || user.displayName.substring(0, 2).toUpperCase()
              )}
            </div>
            {navStyle === "sidebar" && !isSidebarCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {user.displayName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.role}</p>
              </div>
            )}
            {navStyle === "sidebar" && !isSidebarCollapsed && (
              <Settings size={16} className="text-gray-400" />
            )}
          </button>
          <button
            onClick={logout}
            className={cn(
              "flex items-center gap-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors",
              navStyle === "sidebar" ? "w-full p-3" : "p-2",
            )}
          >
            <LogOut size={20} />{" "}
            {navStyle === "sidebar" && !isSidebarCollapsed && (
              <span className="font-medium">Sair</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {![
              "dashboard",
              "calendar",
              "events",
              "scales",
              "volunteers",
              "announcements",
              "setlist",
              "cronograma",
              "notifications",
              "maintenance"
            ].includes(activeTab) ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
                <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <AlertTriangle size={48} />
                </div>
                <h2 className="text-4xl font-black text-gray-900 mb-4">404</h2>
                <p className="text-xl text-gray-600 mb-8">
                  Página não encontrada ou em construção.
                </p>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 mx-auto"
                >
                  Voltar para o Início
                </button>
              </div>
            ) : (
              <>
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    {activeTab !== "dashboard" && (
                      <button
                        onClick={() => window.history.back()}
                        className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-lg transition-colors flex shrink-0"
                        title="Voltar"
                      >
                        <ArrowLeft size={24} />
                      </button>
                    )}
                    <h2 className="text-3xl font-bold text-gray-900">
                      {activeTab === "dashboard" &&
                        "Olá, " + user.displayName.split(" ")[0] + "! 👋"}
                      {activeTab === "calendar" && "Calendário Mensal"}
                      {activeTab === "events" && "Agenda de Eventos"}
                      {activeTab === "scales" && "Gestão de Escalas"}
                      {activeTab === "volunteers" && "Equipe de Voluntários"}
                      {activeTab === "announcements" && "Mural de Anúncios"}
                      {activeTab === "setlist" && "Setlist de Louvor"}
                      {activeTab === "cronograma" && "Cronograma do Culto"}
                      {activeTab === "maintenance" && "Central de Manutenção"}
                      {activeTab === "notifications" && "Suas Notificações"}
                    </h2>
                  </div>

                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setActiveTab("notifications")}
                      className={cn(
                        "relative p-3 rounded-full transition-all flex items-center justify-center",
                        activeTab === "notifications"
                          ? "bg-indigo-100 text-indigo-600"
                          : isDarkMode
                            ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                      )}
                      title="Notificações"
                    >
                      <Bell size={20} />
                      {notifications.filter((n) => !n.read).length > 0 && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                      )}
                    </button>

                    <button
                      onClick={() => setIsAppearanceModalOpen(true)}
                      className={cn(
                        "relative p-3 rounded-full transition-all flex items-center justify-center",
                        isDarkMode
                          ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                      )}
                      title="Aparência e Layout"
                    >
                      <Palette size={20} />
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-3">
                        <div className="relative group w-full md:w-96">
                          <input
                            type="text"
                            placeholder="Comando IA (Evento, Voluntário, Notif)..."
                            className="pl-12 pr-12 py-4 bg-white/80 backdrop-blur-sm border-2 border-indigo-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none w-full shadow-lg shadow-indigo-500/5 transition-all placeholder:text-gray-400 font-medium"
                            value={aiCommand}
                            onChange={(e) => setAiCommand(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleAiCommand()
                            }
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <Sparkles className="text-indigo-600" size={14} />
                          </div>
                          <button
                            onClick={handleAiCommand}
                            disabled={isAiLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-indigo-200"
                          >
                            {isAiLoading ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                            ) : (
                              <Plus size={20} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </header>

                {activeTab === "dashboard" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                      {/* Mensagem Bíblica */}
                      <section className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                          <Heart size={120} />
                        </div>
                        <div className="relative z-10">
                          <blockquote className="text-2xl font-serif italic mb-4 leading-relaxed">
                            "Servi ao Senhor com alegria; apresentai-vos diante
                            dele com cântico."
                          </blockquote>
                          <cite className="text-sm font-bold opacity-80">
                            — Salmos 100:2
                          </cite>
                          <p className="mt-6 text-blue-100 text-sm max-w-md">
                            Seu serviço na casa de Deus é precioso. Que seu
                            coração se alegre ao servir hoje!
                          </p>
                        </div>
                      </section>

                      {/* Mural de Anúncios */}
                      <section>
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Megaphone className="text-indigo-600" size={20} />
                          Mural da Igreja
                        </h3>
                        <div
                          className={cn(
                            "grid gap-4",
                            layoutMode === "modern"
                              ? "grid-cols-1 md:grid-cols-2"
                              : "grid-cols-1",
                          )}
                        >
                          {announcements
                            .slice(0, layoutMode === "modern" ? 2 : 4)
                            .map((ann) => (
                              <div
                                key={ann.id}
                                className={cn(
                                  "bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all group",
                                  layoutMode === "modern"
                                    ? "p-6 rounded-3xl"
                                    : "p-4 rounded-2xl flex items-center justify-between gap-4",
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center shrink-0">
                                      <Megaphone size={12} />
                                    </div>
                                    <h4 className="font-bold text-gray-900 truncate">
                                      {ann.title}
                                    </h4>
                                  </div>
                                  <p
                                    className={cn(
                                      "text-gray-600 line-clamp-1",
                                      layoutMode === "modern"
                                        ? "text-sm mb-4"
                                        : "text-xs",
                                    )}
                                  >
                                    {ann.description}
                                  </p>
                                  {layoutMode === "modern" && ann.pdfUrl && (
                                    <a
                                      href={ann.pdfUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all"
                                    >
                                      <FileText size={14} /> Ver PDF
                                    </a>
                                  )}
                                </div>
                                <div className="flex flex-col items-end shrink-0">
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md uppercase tracking-wider mb-2">
                                    {ann.date}
                                  </span>
                                  {layoutMode === "compact" && ann.pdfUrl && (
                                    <a
                                      href={ann.pdfUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                                    >
                                      <FileText size={16} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          {announcements.length === 0 && (
                            <p className="text-gray-400 text-sm italic">
                              Nenhum anúncio recente.
                            </p>
                          )}
                        </div>
                      </section>

                      {/* Próximos Eventos */}
                      <section>
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Clock className="text-indigo-600" size={20} />
                          Próximos Eventos
                        </h3>
                        <div
                          className={cn(
                            "grid gap-4",
                            layoutMode === "modern"
                              ? "grid-cols-1 md:grid-cols-2"
                              : "grid-cols-1",
                          )}
                        >
                          {events
                            .filter(
                              (e) =>
                                new Date(e.date) >=
                                new Date(new Date().setHours(0, 0, 0, 0)),
                            )
                            .slice(0, layoutMode === "modern" ? 4 : 6)
                            .map((event) => (
                              <EventCard
                                key={event.id}
                                event={event}
                                onCheckIn={handleCheckIn}
                                userCheckIn={checkins.find(
                                  (c) =>
                                    c.eventId === event.id &&
                                    c.userId === user.uid,
                                )}
                                isAdmin={isAdmin}
                                onEdit={() => {
                                  setEditingEvent(event);
                                  setIsEventModalOpen(true);
                                }}
                                onDelete={() => handleDeleteEvent(event.id)}
                                onDuplicate={() => handleDuplicateEvent(event)}
                                compact={layoutMode === "compact"}
                                reactions={reactions.filter(
                                  (r) => r.targetId === event.id,
                                )}
                                onReaction={(emoji) =>
                                  handleReaction(event.id, emoji)
                                }
                                currentUserId={user.uid}
                                allUsers={allUsers}
                                checkins={checkins}
                              />
                            ))}
                          {events.filter((e) => new Date(e.date) >= new Date())
                            .length === 0 && (
                            <p className="text-gray-400 text-sm italic">
                              Nenhum evento futuro.
                            </p>
                          )}
                        </div>
                      </section>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        {/* Cronograma Resumo */}
                        <section>
                          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <CalendarIcon
                              className="text-indigo-600"
                              size={20}
                            />
                            Cronograma
                          </h3>
                          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                            {cronogramas.slice(0, 2).map((c) => (
                              <div
                                key={c.id}
                                className="mb-4 last:mb-0 border-b last:border-0 pb-4 last:pb-0 cursor-pointer group"
                                onClick={() => setViewingCronograma(c)}
                              >
                                <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                  {c.title}
                                </h4>
                                <p className="text-xs text-gray-500 mb-2">
                                  {formatDate(c.date)}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab("cronograma");
                                  }}
                                  className="text-xs font-bold text-indigo-600 hover:underline"
                                >
                                  Ver todos
                                </button>
                              </div>
                            ))}
                            {cronogramas.length === 0 && (
                              <p className="text-gray-400 text-sm italic">
                                Nenhum cronograma.
                              </p>
                            )}
                          </div>
                        </section>

                        {/* Setlist Resumo */}
                        <section>
                          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="text-indigo-600" size={20} />
                            Setlist
                          </h3>
                          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                            {setlists.slice(0, 2).map((s) => (
                              <div
                                key={s.id}
                                className="mb-4 last:mb-0 border-b last:border-0 pb-4 last:pb-0 cursor-pointer group"
                                onClick={() => setViewingSetlist(s)}
                              >
                                <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                  {s.title}
                                </h4>
                                <p className="text-xs text-gray-500 mb-2">
                                  {formatDate(s.date)}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab("setlist");
                                  }}
                                  className="text-xs font-bold text-indigo-600 hover:underline"
                                >
                                  Ver todas
                                </button>
                              </div>
                            ))}
                            {setlists.length === 0 && (
                              <p className="text-gray-400 text-sm italic">
                                Nenhuma setlist.
                              </p>
                            )}
                          </div>
                        </section>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {/* Destaque de Próximas Escalas */}
                      <section>
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Users className="text-indigo-600" size={20} />
                          Escalados em Breve
                        </h3>
                        <div className="space-y-3">
                          {events
                            .filter(
                              (e) =>
                                new Date(e.date) >=
                                new Date(new Date().setHours(0, 0, 0, 0)),
                            )
                            .slice(0, 3)
                            .map((event) => {
                              const scale = scales.find(
                                (s) => s.eventId === event.id,
                              );
                              if (!scale || scale.assignments.length === 0)
                                return null;

                              return (
                                <div
                                  key={event.id}
                                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                                        {formatDate(event.date)}
                                      </p>
                                      <h4 className="text-sm font-bold text-gray-900">
                                        {event.title}
                                      </h4>
                                    </div>
                                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                                      {scale.assignments.length} PESSOAS
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {scale.assignments.filter(a => a.userId && a.userId !== "EMPTY").map((a, idx) => {
                                      const u = allUsers.find(
                                            (user) => user.uid === a.userId,
                                          );
                                      return (
                                        <div
                                          key={idx}
                                          className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border",
                                            "bg-gray-50 border-gray-100",
                                          )}
                                        >
                                          <div
                                            className={cn(
                                              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                              "bg-indigo-100 text-indigo-600",
                                            )}
                                          >
                                            {u?.displayName?.[0] || ""}
                                          </div>
                                          <div className="flex flex-col">
                                            <span
                                              className={cn(
                                                "text-[10px] font-bold leading-none",
                                                "text-gray-900",
                                              )}
                                            >
                                              {u?.displayName.split(" ")[0]}
                                            </span>
                                            <span className="text-[8px] text-gray-500 font-medium uppercase tracking-tighter">
                                              {(a.roles || [a.role])
                                                .filter(Boolean)
                                                .join(", ")}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </section>

                      <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        <p className="text-indigo-100 text-sm font-medium mb-1">
                          Sua Próxima Escala
                        </p>
                        <h4 className="text-2xl font-bold mb-4">
                          {events.find(
                            (e) =>
                              new Date(e.date) >= new Date() &&
                              scales.some(
                                (s) =>
                                  s.eventId === e.id &&
                                  s.assignments.some(
                                    (a) => a.userId === user.uid,
                                  ),
                              ),
                          )?.title || "Sem escalas"}
                        </h4>
                        <div className="flex items-center gap-2 text-indigo-100 text-sm">
                          <CalendarIcon size={16} />
                          <span>
                            {events.find(
                              (e) =>
                                new Date(e.date) >= new Date() &&
                                scales.some(
                                  (s) =>
                                    s.eventId === e.id &&
                                    s.assignments.some(
                                      (a) => a.userId === user.uid,
                                    ),
                                ),
                            )?.date
                              ? formatDate(
                                  events.find(
                                    (e) =>
                                      new Date(e.date) >= new Date() &&
                                      scales.some(
                                        (s) =>
                                          s.eventId === e.id &&
                                          s.assignments.some(
                                            (a) => a.userId === user.uid,
                                          ),
                                      ),
                                  )!.date,
                                )
                              : "--/--"}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                          Notificações
                          <button
                            onClick={() => setActiveTab("notifications")}
                            className="text-indigo-600 text-xs hover:underline"
                          >
                            Ver todas
                          </button>
                        </h3>
                        <div className="space-y-4">
                          {notifications.slice(0, 3).map((notif) => (
                            <div key={notif.id} className="flex gap-3">
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                  notif.read ? "bg-gray-300" : "bg-indigo-600",
                                )}
                              />
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  {notif.title}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-1">
                                  {notif.message}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "calendar" && (
                  <CalendarView
                    events={events}
                    scales={scales}
                    allUsers={allUsers}
                    isAdmin={isAdmin}
                    user={user}
                    setSelectedEventForScale={setSelectedEventForScale}
                    setIsScaleModalOpen={setIsScaleModalOpen}
                    calendarFilterType={calendarFilterType}
                    setCalendarFilterType={setCalendarFilterType}
                    calendarFilterStatus={calendarFilterStatus}
                    setCalendarFilterStatus={setCalendarFilterStatus}
                  />
                )}

                {activeTab === "events" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showPastEvents}
                            onChange={(e) => setShowPastEvents(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-medium">
                            Incluir anteriores
                          </span>
                        </label>
                        <select 
                          className="text-sm p-2 bg-white border border-gray-200 rounded-xl outline-none"
                          value={eventFilterType}
                          onChange={(e) => setEventFilterType(e.target.value)}
                        >
                          <option value="all">Todos os Tipos</option>
                          <option value="CULTO">Culto</option>
                          <option value="ENSAIO">Ensaio</option>
                          <option value="REUNIAO">Reunião</option>
                        </select>
                        <select 
                          className="text-sm p-2 bg-white border border-gray-200 rounded-xl outline-none"
                          value={eventFilterStatus}
                          onChange={(e) => setEventFilterStatus(e.target.value)}
                        >
                          <option value="all">Qualquer Status</option>
                          <option value="AGENDADO">Agendado</option>
                          <option value="CONCLUIDO">Concluído</option>
                        </select>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditingEvent(null);
                            setIsEventModalOpen(true);
                          }}
                          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors w-full sm:w-auto justify-center"
                        >
                          <Plus size={20} /> Novo Evento
                        </button>
                      )}
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm relative z-50">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-full">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Evento
                              </th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Data
                              </th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Tipo
                              </th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Reações
                              </th>
                              {isAdmin && (
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                                  Ações
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {events
                              .filter(
                                (e) =>
                                  showPastEvents ||
                                  new Date(e.date) >=
                                    new Date(new Date().setHours(0, 0, 0, 0)),
                              )
                              .filter((e) => eventFilterType === 'all' || e.type === eventFilterType)
                              .filter((e) => {
                                if (eventFilterStatus === 'all') return true;
                                const isPast = new Date(e.date) < new Date(new Date().setHours(0, 0, 0, 0));
                                if (eventFilterStatus === 'CONCLUIDO') return isPast;
                                if (eventFilterStatus === 'AGENDADO') return !isPast;
                                return true;
                              })
                              .map((event) => (
                                <React.Fragment key={event.id}>
                                  <tr
                                    className="hover:bg-gray-50 transition-colors group"
                                  >
                                    <td className="px-6 py-4">
                                    <p className="font-bold text-gray-900">
                                      {event.title}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {event.description}
                                    </p>
                                    {checkins.filter(
                                      (c) =>
                                        c.eventId === event.id &&
                                        c.status === "PRESENTE",
                                    ).length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {checkins
                                          .filter(
                                            (c) =>
                                              c.eventId === event.id &&
                                              c.status === "PRESENTE",
                                          )
                                          .map((c) => (
                                            <span
                                              key={c.id}
                                              className="text-[7px] font-bold px-1 py-0.5 bg-green-50 text-green-700 rounded border border-green-100"
                                            >
                                              {
                                                allUsers
                                                  .find(
                                                    (u) => u.uid === c.userId,
                                                  )
                                                  ?.displayName.split(" ")[0]
                                              }
                                            </span>
                                          ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600">
                                    {formatDate(event.date)}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                                        event.type === "CULTO"
                                          ? "bg-blue-600 text-white"
                                          : event.type === "ENSAIO"
                                            ? "bg-sky-400 text-white"
                                            : "bg-rose-900 text-white",
                                      )}
                                    >
                                      {event.type}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <ReactionDisplay
                                        reactions={reactions.filter(
                                          (r) => r.targetId === event.id,
                                        )}
                                        allUsers={allUsers}
                                      />
                                      <div className="transition-opacity">
                                        <ReactionPicker
                                          onReact={(emoji) =>
                                            handleReaction(event.id, emoji)
                                          }
                                          currentUserId={user.uid}
                                          reactions={reactions.filter(
                                            (r) => r.targetId === event.id,
                                          )}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  {isAdmin && (
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() =>
                                            handleDuplicateEvent(event)
                                          }
                                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                          title="Duplicar"
                                        >
                                          <Plus size={18} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingEvent(event);
                                            setIsEventModalOpen(true);
                                          }}
                                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                        >
                                          <Edit size={18} />
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeleteEvent(event.id)
                                          }
                                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                                  <tr className="bg-gray-50/20 shadow-sm">
                                    <td colSpan={isAdmin ? 5 : 4} className="px-6 py-4 border-b border-gray-100">
                                      {user && (
                                        <div className="w-full">
                                          <EventComments eventId={event.id} user={user} isAdmin={isAdmin} />
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "scales" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex flex-col gap-4 w-full sm:w-auto">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showPastEvents}
                            onChange={(e) => setShowPastEvents(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-medium">
                            Mostrar escalas passadas
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setScaleViewMode('cards')}
                            className={cn("text-xs font-bold px-3 py-1.5 rounded-lg border uppercase", scaleViewMode === 'cards' ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200")}
                          >
                            Visualização Cards
                          </button>
                          <button
                            onClick={() => setScaleViewMode('weekly')}
                            className={cn("text-xs font-bold px-3 py-1.5 rounded-lg border uppercase", scaleViewMode === 'weekly' ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200")}
                          >
                            Resumo Semanal
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                        <select
                          className="p-2 bg-white border border-gray-200 rounded-xl outline-none text-sm w-full sm:w-auto"
                          value={scaleFilterRole}
                          onChange={(e) => setScaleFilterRole(e.target.value)}
                        >
                          <option value="all">Todas as Funções</option>
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <select
                          className="p-2 bg-white border border-gray-200 rounded-xl outline-none text-sm w-full sm:w-auto"
                          value={scaleFilterVolunteer}
                          onChange={(e) =>
                            setScaleFilterVolunteer(e.target.value)
                          }
                        >
                          <option value="all">Todos os Voluntários</option>
                          {allUsers.map((u) => (
                            <option key={u.uid} value={u.uid}>
                              {u.displayName}
                            </option>
                          ))}
                        </select>
                        
                        {isAdmin && (
                          <div className="flex gap-2 w-full sm:w-auto">
                            {scaleViewMode === 'weekly' && (
                              <button
                                onClick={handleExportWeeklyScale}
                                className="bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl font-bold flex flex-1 sm:flex-none items-center justify-center gap-2 hover:bg-blue-100 transition-colors border border-blue-100"
                              >
                                <Download size={18} /> PDF
                              </button>
                            )}
                            <button
                              onClick={() => setIsDateScheduleModalOpen(true)}
                              className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl font-bold flex flex-1 sm:flex-none items-center justify-center gap-2 hover:bg-indigo-100 transition-colors border border-indigo-100"
                            >
                              <CalendarDays size={18} /> Agendar
                            </button>
                            <button
                              onClick={handleBatchGenerateScales}
                              className="bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl font-bold flex flex-1 sm:flex-none items-center justify-center gap-2 hover:bg-amber-100 transition-colors border border-amber-100"
                            >
                              <Sparkles size={18} /> IA
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {scaleViewMode === 'cards' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events
                          .filter(
                            (e) =>
                              showPastEvents ||
                              new Date(e.date) >=
                                new Date(new Date().setHours(0, 0, 0, 0)),
                          )
                          .filter((event) => {
                            const scale = scales.find((s) => s.eventId === event.id);
                            let include = true;
                            if (scaleFilterVolunteer !== "all") {
                              include = include && !!scale?.assignments.some((a) => a.userId === scaleFilterVolunteer);
                            }
                            if (scaleFilterRole !== "all") {
                              // Se estiver filtrando por função, checamos se aquela ROLE está em alguma das assignments
                              include = include && !!scale?.assignments.some((a) => (a.roles || [a.role]).includes(scaleFilterRole));
                            }
                            return include;
                          })
                        .map((event) => {
                          const scale = scales.find(
                            (s) => s.eventId === event.id,
                          );
                          const scaleReactions = scale
                            ? reactions.filter((r) => r.targetId === scale.id)
                            : [];

                          return (
                            <div
                              key={event.id}
                              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group"
                            >
                              <div
                                className={cn(
                                  "absolute top-0 left-0 w-full h-1.5",
                                  event.type === "CULTO"
                                    ? "bg-blue-600"
                                    : event.type === "ENSAIO"
                                      ? "bg-sky-400"
                                      : "bg-rose-900",
                                )}
                              />
                              <h4 className="font-bold text-gray-900 mb-1">
                                {event.title}
                              </h4>
                              <p className="text-[10px] text-gray-500 mb-4">
                                {formatDate(event.date)}
                              </p>
                              <div className="space-y-2 mb-6">
                                {scale?.assignments.filter(a => a.userId && a.userId !== "EMPTY").map((a, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded-xl"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={cn(
                                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                          "bg-indigo-100 text-indigo-600",
                                        )}
                                      >
                                        {allUsers.find(
                                              (u) => u.uid === a.userId,
                                            )?.displayName?.[0] || ""}
                                      </div>
                                      <span
                                        className={cn(
                                          "text-xs font-medium",
                                          "text-gray-700",
                                        )}
                                      >
                                        {allUsers.find(
                                              (u) => u.uid === a.userId,
                                            )?.displayName || ""}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 justify-end max-w-[100px]">
                                      {(a.roles || [a.role])
                                        .filter(Boolean)
                                        .map((r: string) => (
                                          <span
                                            key={r}
                                            className={cn(
                                              "text-[7px] font-bold px-1 py-0.5 rounded uppercase tracking-tighter",
                                              "bg-indigo-50 text-indigo-600",
                                            )}
                                          >
                                            {r}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                ))}
                                {(!scale || scale.assignments.filter(a => a.userId && a.userId !== "EMPTY").length === 0) && (
                                  <p className="text-xs text-gray-400 italic">
                                    Ninguém escalado.
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-50">
                                <div className="flex items-center gap-2">
                                  <ReactionDisplay
                                    reactions={scaleReactions}
                                    allUsers={allUsers}
                                  />
                                  {scale && (
                                    <div className="transition-opacity">
                                      <ReactionPicker
                                        onReact={(emoji) =>
                                          handleReaction(scale.id, emoji)
                                        }
                                        currentUserId={user.uid}
                                        reactions={scaleReactions}
                                      />
                                    </div>
                                  )}
                                </div>
                                {isAdmin && (
                                  <button
                                    onClick={() => {
                                      setSelectedEventForScale(event);
                                      setIsScaleModalOpen(true);
                                    }}
                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-all uppercase"
                                  >
                                    Editar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    ) : (
                      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm p-6 overflow-x-auto">
                        <table id="scales-weekly-table" className="w-full text-left min-w-[800px]">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Evento</th>
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Equipe</th>
                              {isAdmin && <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ação</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {events
                              .filter(
                                (e) =>
                                  showPastEvents ||
                                  new Date(e.date) >=
                                    new Date(new Date().setHours(0, 0, 0, 0)),
                              )
                              .filter((event) => {
                                const scale = scales.find((s) => s.eventId === event.id);
                                let include = true;
                                if (scaleFilterVolunteer !== "all") {
                                  include = include && !!scale?.assignments.some((a) => a.userId === scaleFilterVolunteer);
                                }
                                if (scaleFilterRole !== "all") {
                                  include = include && !!scale?.assignments.some((a) => (a.roles || [a.role]).includes(scaleFilterRole));
                                }
                                return include;
                              })
                              .map(event => {
                                const scale = scales.find((s) => s.eventId === event.id);
                                return (
                                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-bold text-gray-900">{event.title}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(event.date)}</td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-wrap gap-2">
                                        {scale?.assignments.filter(a => a.userId && a.userId !== "EMPTY").map((a, i) => {
                                          return (
                                            <div key={i} className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-lg">
                                              <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold", "bg-indigo-100 text-indigo-600")}>
                                                {allUsers.find(u => u.uid === a.userId)?.displayName?.[0] || ""}
                                              </div>
                                              <span className={cn("text-[10px] font-medium max-w-[80px] truncate", "text-gray-700")}>
                                                {allUsers.find(u => u.uid === a.userId)?.displayName?.split(' ')?.[0] || ""}
                                              </span>
                                              <span className="text-[8px] text-gray-500 uppercase font-bold tracking-tighter mix-blend-multiply">
                                                {(a.roles || [a.role]).filter(Boolean).join(',')}
                                              </span>
                                            </div>
                                          );
                                        })}
                                        {(!scale || scale.assignments.filter(a => a.userId && a.userId !== "EMPTY").length === 0) && <span className="text-xs text-gray-400 italic">Sem equipe</span>}
                                      </div>
                                    </td>
                                    {isAdmin && (
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() => {
                                            setSelectedEventForScale(event);
                                            setIsScaleModalOpen(true);
                                          }}
                                          className="text-indigo-600 hover:text-indigo-900 text-xs font-bold uppercase"
                                        >
                                          Editar
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "announcements" && (
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      {isAdmin && (
                        <button
                          onClick={() => setIsAnnouncementModalOpen(true)}
                          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                        >
                          <Plus size={20} /> Novo Anúncio
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {announcements.map((ann) => (
                        <div
                          key={ann.id}
                          className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative group"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-xl font-bold text-gray-900">
                              {ann.title}
                            </h4>
                            {isAdmin && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingAnnouncement(ann);
                                    setIsAnnouncementModalOpen(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-indigo-600 transition-opacity"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await deleteDoc(
                                        doc(db, "announcements", ann.id),
                                      );
                                      toast.success("Anúncio excluído");
                                    } catch (error) {
                                      handleFirestoreError(
                                        error,
                                        OperationType.DELETE,
                                        "announcements",
                                      );
                                    }
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-600 transition-opacity"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-gray-500 text-sm mb-4">
                            <div className="flex items-center gap-1">
                              <CalendarIcon size={14} /> <span>{ann.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={14} /> <span>{ann.time}</span>
                            </div>
                          </div>
                          <p className="text-gray-600 mb-6">
                            {ann.description}
                          </p>
                          {ann.pdfUrl && (
                            <a
                              href={ann.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                            >
                              <FileText size={16} /> Ver PDF
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "notifications" && (
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                         <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                           <Bell size={20} className="text-indigo-600" /> Push Notifications
                         </h3>
                         <p className="text-sm text-gray-500">Receba alertas no celular em tempo real.</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium text-gray-700">{localPushEnabled ? 'Ativado' : 'Desativado'}</span>
                        <button
                          role="switch"
                          aria-checked={localPushEnabled}
                          onClick={async () => {
                            const newValue = !localPushEnabled;
                            setLocalPushEnabled(newValue); // Optimistic UI
                            if (newValue && "Notification" in window) {
                              try {
                                const permission = await window.Notification.requestPermission();
                                if (permission === "granted") {
                                  if (messaging) {
                                    const { getToken } = await import('firebase/messaging');
                                    const vKey = "BFoLlMlj01AqBHRBH935fkVn71ppmRm3241wR1HlMCpBclqSlOR-kkRfdhrfob35QG1v7WJ8mxA_5nJNFwWk_iA";
                                    const token = await getToken(messaging, { vapidKey: vKey });
                                    if (token) {
                                      await updateDoc(doc(db, "users", user.uid), { fcmTokens: arrayUnion(token), pushEnabled: true });
                                      toast.success("Notificações ativadas com sucesso!");
                                    } else {
                                      toast.error("Não foi possível gerar um token FCM. Configure seu VAPID_KEY.");
                                      setLocalPushEnabled(false);
                                    }
                                  } else {
                                    await updateDoc(doc(db, "users", user.uid), { pushEnabled: true });
                                    toast.success("Permissão concedida. Integração local ativada.");
                                  }
                                } else {
                                  toast.error("A permissão para notificações foi negada.");
                                  setLocalPushEnabled(false);
                                }
                              } catch (err) {
                                console.error(err);
                                toast.error("Erro ao registrar notificações: " + (err as Error).message);
                                setLocalPushEnabled(false);
                              }
                            } else {
                              await updateDoc(doc(db, "users", user.uid), { pushEnabled: newValue });
                              if (!newValue) {
                                toast.success("Notificações push desativadas.");
                              } else {
                                toast.error("Seu dispositivo ou navegador não suporta notificações Push.");
                                setLocalPushEnabled(false);
                              }
                            }
                          }}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                            localPushEnabled ? "bg-indigo-600" : "bg-gray-300"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              localPushEnabled ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setIsNotifModalOpen(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-md hover:bg-indigo-700 transition-colors ml-4"
                          >
                            <Send size={16} /> Redigir Alerta Push (Admin)
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-500 uppercase tracking-widest text-xs px-2">Suas Mensagens</h3>
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          "p-6 rounded-3xl border transition-all",
                          notif.read
                            ? isDarkMode
                              ? "bg-slate-800 border-slate-700 opacity-75"
                              : "bg-white border-gray-100 opacity-75"
                            : isDarkMode
                              ? "bg-indigo-900/30 border-indigo-500/30 shadow-md"
                              : "bg-indigo-50 border-indigo-100 shadow-md",
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4
                            className={cn(
                              "font-bold",
                              isDarkMode ? "text-white" : "text-gray-900",
                            )}
                          >
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-gray-400">
                            {formatDate(notif.createdAt)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "text-sm mb-4",
                            isDarkMode ? "text-gray-300" : "text-gray-600",
                          )}
                        >
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-4">
                          {!notif.read && (
                            <button
                              onClick={async () => {
                                try {
                                  await updateDoc(
                                    doc(db, "notifications", notif.id),
                                    { read: true },
                                  );
                                } catch (error) {
                                  handleFirestoreError(
                                    error,
                                    OperationType.UPDATE,
                                    "notifications",
                                  );
                                }
                              }}
                              className={cn(
                                "text-xs font-bold hover:underline",
                                isDarkMode
                                  ? "text-indigo-400"
                                  : "text-indigo-600",
                              )}
                            >
                              Marcar como lida
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              try {
                                await deleteDoc(
                                  doc(db, "notifications", notif.id),
                                );
                                toast.success("Notificação excluída");
                              } catch (error) {
                                handleFirestoreError(
                                  error,
                                  OperationType.DELETE,
                                  "notifications",
                                );
                              }
                            }}
                            className={cn(
                              "text-xs font-bold hover:underline",
                              isDarkMode ? "text-red-400" : "text-red-600",
                            )}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                )}

                {activeTab === "volunteers" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold text-gray-900">
                        {/* Title will be rendered by the generic h2 above, so we keep this empty or just leave the New Volunteer button */}
                      </h3>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditingVolunteer(null);
                            setIsVolunteerModalOpen(true);
                          }}
                          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                        >
                          <Plus size={20} /> Novo Voluntário
                        </button>
                      )}
                    </div>
                    
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        🎉 Próximos Aniversariantes
                      </h4>
                      {(() => {
                        const today = new Date();
                        const upcoming = allUsers
                          .filter(u => u.birthDate)
                          .map(u => {
                            const [year, month, day] = u.birthDate!.split('-');
                            let nextBday = new Date(today.getFullYear(), parseInt(month) - 1, parseInt(day));
                            if (nextBday < new Date(today.setHours(0, 0, 0, 0))) {
                              nextBday = new Date(today.getFullYear() + 1, parseInt(month) - 1, parseInt(day));
                            }
                            return { ...u, nextBday };
                          })
                          .sort((a, b) => a.nextBday.getTime() - b.nextBday.getTime())
                          .slice(0, 5);

                        if (upcoming.length === 0) {
                          return <p className="text-sm text-gray-500">Nenhum aniversário cadastrado.</p>;
                        }

                        return (
                          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                            {upcoming.map(u => (
                              <div key={u.uid} className="flex-shrink-0 bg-gray-50 border border-gray-100 rounded-2xl p-4 min-w-[200px] flex items-center gap-3">
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
                                  style={{ backgroundColor: u.bg_color || "#4F46E5" }}
                                >
                                  {u.profile_emoji ? (
                                    u.profile_emoji
                                  ) : u.photoURL ? (
                                    <img src={u.photoURL} alt="" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                                  ) : (
                                    u.initials || u.displayName[0]
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 text-sm truncate w-24">
                                    {u.displayName.split(' ')[0]}
                                  </p>
                                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-0.5">
                                    {format(u.nextBday, "dd/MM")}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allUsers.map((u) => (
                        <div
                          key={u.uid}
                          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4 relative group"
                        >
                          <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0"
                            style={{ backgroundColor: u.bg_color || "#4F46E5" }}
                          >
                            {u.profile_emoji ? (
                              u.profile_emoji
                            ) : u.photoURL ? (
                              <img
                                src={u.photoURL}
                                alt=""
                                className="w-full h-full object-cover rounded-2xl"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              u.initials || u.displayName.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">
                              {u.displayName}
                            </h4>
                            <p className="text-xs text-gray-500 mb-2">
                              {u.email}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase">
                                {u.role}
                              </span>
                              {u.specialty && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold uppercase">
                                  {u.specialty}
                                </span>
                              )}
                              {u.status === "pending" && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-md text-[10px] font-bold uppercase">
                                  Pendente
                                </span>
                              )}
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="absolute top-4 right-4 flex gap-1 transition-opacity">
                              {u.status === "pending" && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, "users", u.uid), {
                                        status: "approved",
                                      });
                                      toast.success("Usuário aprovado!");
                                    } catch (error) {
                                      handleFirestoreError(
                                        error,
                                        OperationType.UPDATE,
                                        "users",
                                      );
                                    }
                                  }}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Aprovar usuário"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingVolunteer(u);
                                  setIsVolunteerModalOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await deleteDoc(doc(db, "users", u.uid));
                                    toast.success("Voluntário excluído");
                                  } catch (error) {
                                    handleFirestoreError(
                                      error,
                                      OperationType.DELETE,
                                      "users",
                                    );
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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

                {activeTab === "setlist" && (
                  <SetlistView
                    setlists={setlists}
                    isAdmin={isAdmin}
                    theme={theme}
                    setViewingSetlist={setViewingSetlist}
                    users={allUsers}
                  />
                )}

                {activeTab === "cronograma" && (
                  <CronogramaView
                    cronogramas={cronogramas}
                    isAdmin={isAdmin}
                    theme={theme}
                    setViewingCronograma={setViewingCronograma}
                    users={allUsers}
                  />
                )}

                {activeTab === "maintenance" && (
                  <MaintenanceCenter
                    isAdmin={canSeeMaintenanceAndNotifications}
                    events={events}
                    scales={scales}
                    users={allUsers}
                  />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modals */}
      {viewingSetlist && (
        <Modal
          title={viewingSetlist.title}
          onClose={() => setViewingSetlist(null)}
          isDarkMode={isDarkMode}
        >
          <div
            className={cn(
              "prose prose-sm sm:prose-base max-w-none",
              isDarkMode ? "text-gray-200 prose-invert" : "text-gray-800",
            )}
            dangerouslySetInnerHTML={{ __html: viewingSetlist.content }}
          />
        </Modal>
      )}
      {viewingCronograma && (
        <Modal
          title={viewingCronograma.title}
          onClose={() => setViewingCronograma(null)}
          isDarkMode={isDarkMode}
        >
          <div className="space-y-6">
            {viewingCronograma.content && (
              <div
                className={cn(
                  "prose prose-sm sm:prose-base max-w-none",
                  isDarkMode ? "text-gray-200 prose-invert" : "text-gray-800",
                )}
                dangerouslySetInnerHTML={{ __html: viewingCronograma.content }}
              />
            )}
            {viewingCronograma.externalLink && (
              <a
                href={viewingCronograma.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline"
              >
                <ExternalLink size={20} /> Acessar Link Externo
              </a>
            )}
          </div>
        </Modal>
      )}
      {isProfileModalOpen && (
        <Modal
          title="Seu Perfil"
          onClose={() => setIsProfileModalOpen(false)}
          isDarkMode={isDarkMode}
        >
          <ProfileForm
            user={user}
            onSave={() => setIsProfileModalOpen(false)}
            theme={theme}
          />
        </Modal>
      )}
      {isEventModalOpen && (
        <Modal
          title={editingEvent ? "Editar Evento" : "Novo Evento"}
          onClose={() => setIsEventModalOpen(false)}
          isDarkMode={isDarkMode}
        >
          <EventForm
            initialData={editingEvent}
            theme={theme}
            onSave={async (data) => {
              const toastId = toast.loading(
                editingEvent ? "Atualizando..." : "Criando...",
              );
              try {
                if (editingEvent) {
                  await updateDoc(doc(db, "events", editingEvent.id), data);
                  toast.success("Evento atualizado!", { id: toastId });
                } else {
                  const eventData = {
                    ...data,
                    createdBy: user.uid,
                    createdAt: new Date().toISOString(),
                  };
                  const docRef = await addDoc(
                    collection(db, "events"),
                    eventData,
                  );
                  await addDoc(collection(db, "scales"), {
                    eventId: docRef.id,
                    assignments: [],
                  });

                  if (data.isRecurring) {
                    const count = await generateRecurringEvents(
                      eventData,
                      data.durationMonths || 3,
                      data.autoSchedule,
                    );
                    toast.success(
                      `Evento criado com mais ${count} ocorrências!`,
                      { id: toastId },
                    );
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
        <Modal
          title="Enviar Notificação"
          onClose={() => setIsNotifModalOpen(false)}
          isDarkMode={isDarkMode}
        >
          <NotificationForm
            users={allUsers}
            theme={theme}
            onSave={async (data) => {
              try {
                const targetUsers =
                  data.userId === "all"
                    ? allUsers
                    : [allUsers.find((u) => u.uid === data.userId)!];
                for (const u of targetUsers) {
                  await addDoc(collection(db, "notifications"), {
                    userId: u.uid,
                    title: data.title,
                    message: data.message,
                    read: false,
                    createdAt: new Date().toISOString(),
                  });
                }
                toast.success("Notificação enviada!");
                setIsNotifModalOpen(false);
              } catch (error) {
                handleFirestoreError(
                  error,
                  OperationType.CREATE,
                  "notifications",
                );
              }
            }}
          />
        </Modal>
      )}

      {isAnnouncementModalOpen && (
        <Modal
          title={editingAnnouncement ? "Editar Anúncio" : "Novo Anúncio"}
          onClose={() => {
            setIsAnnouncementModalOpen(false);
            setEditingAnnouncement(null);
          }}
          isDarkMode={isDarkMode}
        >
          <AnnouncementForm
            initialData={editingAnnouncement}
            theme={theme}
            onSave={async (data) => {
              if (editingAnnouncement) {
                await updateDoc(doc(db, "announcements", editingAnnouncement.id), data);
                toast.success("Anúncio atualizado!");
              } else {
                await addDoc(collection(db, "announcements"), {
                  ...data,
                  createdAt: new Date().toISOString(),
                });
                toast.success("Anúncio publicado!");
              }
              setIsAnnouncementModalOpen(false);
              setEditingAnnouncement(null);
            }}
          />
        </Modal>
      )}

      {isDateScheduleModalOpen && (
        <Modal
          title="Agendamento Específico de Voluntário"
          onClose={() => setIsDateScheduleModalOpen(false)}
          isDarkMode={isDarkMode}
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Selecione o Voluntário
              </p>
              <select
                className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none"
                value={dateScheduleUser}
                onChange={(e) => {
                  setDateScheduleUser(e.target.value);
                  setDateScheduleRole(""); // Reset role when user changes
                }}
              >
                <option value="">Selecionar Voluntário</option>
                {allUsers
                  .filter((u) => u.status === "approved")
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName}
                    </option>
                  ))}
              </select>
            </div>

            {dateScheduleUser && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Selecione a Função
                </p>
                <select
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none"
                  value={dateScheduleRole}
                  onChange={(e) => setDateScheduleRole(e.target.value)}
                >
                  <option value="">Selecionar Função compatível</option>
                  {ROLES.filter((r) =>
                    allUsers
                      .find((u) => u.uid === dateScheduleUser)
                      ?.specialty?.toLowerCase()
                      .includes(r.toLowerCase()),
                  ).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {dateScheduleRole && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Selecione as Datas (Eventos)
                </p>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                  {events
                    .filter(
                      (e) =>
                        new Date(e.date) >=
                        new Date(new Date().setHours(0, 0, 0, 0)),
                    )
                    .map((e) => (
                      <label
                        key={e.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:border-indigo-200 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={dateScheduleEvents.includes(e.id)}
                          onChange={(event) => {
                            if (event.target.checked)
                              setDateScheduleEvents([
                                ...dateScheduleEvents,
                                e.id,
                              ]);
                            else
                              setDateScheduleEvents(
                                dateScheduleEvents.filter((id) => id !== e.id),
                              );
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-gray-900">
                            {e.title}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(e.date)}
                          </span>
                        </div>
                      </label>
                    ))}
                  {events.filter(
                    (e) =>
                      new Date(e.date) >=
                      new Date(new Date().setHours(0, 0, 0, 0)),
                  ).length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      Nenhum evento futuro encontrado.
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleDateScheduleSave}
              className={cn(
                "w-full text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4",
                dateScheduleUser &&
                  dateScheduleRole &&
                  dateScheduleEvents.length > 0
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-gray-300 cursor-not-allowed",
              )}
              disabled={
                !dateScheduleUser ||
                !dateScheduleRole ||
                dateScheduleEvents.length === 0
              }
            >
              <Save size={20} /> Salvar Agendamento
            </button>
          </div>
        </Modal>
      )}

      {isScaleModalOpen && selectedEventForScale && (
        <Modal
          title={`Escala: ${selectedEventForScale.title}`}
          onClose={() => setIsScaleModalOpen(false)}
          isDarkMode={isDarkMode}
        >
          <ScaleForm
            event={selectedEventForScale}
            users={allUsers}
            initialScale={scales.find(
              (s) => s.eventId === selectedEventForScale.id,
            )}
            allScales={scales}
            allEvents={events}
            theme={theme}
            onSave={async (assignments) => {
              const scale = scales.find(
                (s) => s.eventId === selectedEventForScale.id,
              );
              if (scale) {
                await updateDoc(doc(db, "scales", scale.id), { assignments });
              } else {
                await addDoc(collection(db, "scales"), {
                  eventId: selectedEventForScale.id,
                  assignments,
                });
              }
              toast.success("Escala atualizada!");
              setIsScaleModalOpen(false);
            }}
          />
        </Modal>
      )}

      {isVolunteerModalOpen && (
        <Modal
          title={editingVolunteer ? "Editar Voluntário" : "Novo Voluntário"}
          onClose={() => setIsVolunteerModalOpen(false)}
          isDarkMode={isDarkMode}
        >
          <VolunteerForm
            initialData={editingVolunteer}
            theme={theme}
            onSave={async (data) => {
              try {
                if (editingVolunteer) {
                  await updateDoc(doc(db, "users", editingVolunteer.uid), data);
                  toast.success("Voluntário atualizado!");
                } else {
                  // Pre-registering in Firestore
                  await addDoc(collection(db, "users"), {
                    ...data,
                    createdAt: new Date().toISOString(),
                    color:
                      "#" + Math.floor(Math.random() * 16777215).toString(16),
                  });
                  toast.success("Voluntário cadastrado!");
                }
                setIsVolunteerModalOpen(false);
              } catch (error) {
                handleFirestoreError(error, OperationType.WRITE, "users");
              }
            }}
          />
        </Modal>
      )}

      {isAppearanceModalOpen && (
        <Modal
          title="Aparência e Layout"
          onClose={() => setIsAppearanceModalOpen(false)}
          isDarkMode={isDarkMode}
        >
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Tema Visual</h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setVisualTheme("claro")}
                  className={cn("p-4 rounded-xl border text-center transition-all", visualTheme === "claro" ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-white")}
                >
                  <p className="font-bold text-sm text-gray-900">Claro</p>
                </button>
                <button
                  onClick={() => setVisualTheme("escuro")}
                  className={cn("p-4 rounded-xl border text-center transition-all", visualTheme === "escuro" ? "border-indigo-600 bg-slate-800" : "border-slate-700 bg-slate-900")}
                >
                  <p className="font-bold text-sm text-white">Escuro</p>
                </button>
                <button
                  onClick={() => setVisualTheme("vidro")}
                  className={cn("p-4 rounded-xl border text-center transition-all", visualTheme === "vidro" ? "border-indigo-500 ring-2 ring-indigo-500/50 bg-slate-800/80 backdrop-blur-sm shadow-[0_0_15px_rgba(99,102,241,0.5)] outline-none" : "border-gray-200 bg-transparent")}
                >
                  <p className={cn("font-bold text-sm border-none shadow-none", isDarkMode ? "text-white" : "text-gray-900")}>Vidro Fosco</p>
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Cores Principais</h4>
              <div className="flex gap-2 flex-wrap">
                {["electric_blue", "emerald", "neon_purple", "sunset_orange", "hot_pink", "carmine_red", "cyan", "sunflower_yellow"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t as any)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform hover:opacity-80",
                      theme === t ? "border-gray-900 dark:border-white scale-110" : "border-transparent",
                      t === "electric_blue" ? "bg-blue-400" :
                      t === "emerald" ? "bg-emerald-500" :
                      t === "neon_purple" ? "bg-purple-500" :
                      t === "sunset_orange" ? "bg-orange-500" :
                      t === "hot_pink" ? "bg-pink-400" :
                      t === "carmine_red" ? "bg-red-500" :
                      t === "cyan" ? "bg-cyan-500" :
                      "bg-yellow-400"
                    )}
                  />
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Layout dos Cards</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setLayoutMode("modern")}
                  className={cn("flex-1 p-3 rounded-xl border text-center font-bold text-sm transition-all", layoutMode === "modern" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-500")}
                >
                  Moderno
                </button>
                <button
                  onClick={() => setLayoutMode("compact")}
                  className={cn("flex-1 p-3 rounded-xl border text-center font-bold text-sm transition-all", layoutMode === "compact" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-500")}
                >
                  Compacto
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Posição do Menu</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setNavStyle("sidebar")}
                  className={cn("flex-1 p-3 rounded-xl border text-center font-bold text-sm transition-all", navStyle === "sidebar" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-500")}
                >
                  Lateral
                </button>
                <button
                  onClick={() => setNavStyle("top")}
                  className={cn("flex-1 p-3 rounded-xl border text-center font-bold text-sm transition-all", navStyle === "top" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-500")}
                >
                  Superior
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setIsAppearanceModalOpen(false)}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Concluído
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  compact,
  theme = "electric_blue",
  badgeCount,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
  theme?: string;
  badgeCount?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 transition-all group shrink-0 relative",
        compact ? "p-3 rounded-xl" : "px-4 py-3 md:w-full md:p-3 rounded-xl",
        active
          ? "bg-primary shadow-primary text-white"
          : "text-gray-500 hover:bg-gray-100",
        active && theme === "sunflower_yellow" ? "text-slate-900" : ""
      )}
    >
      <span
        className={cn(
          "transition-transform group-hover:scale-110",
          active
            ? "text-inherit"
            : "text-gray-400 group-hover:text-primary",
        )}
      >
        {icon}
      </span>
      {!compact && <span className="font-semibold text-sm">{label}</span>}
      {badgeCount && badgeCount > 0 && (
        <span className="absolute top-2 right-2 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
      {!compact && active && (
        <ChevronRight
          size={16}
          className="ml-auto opacity-50 hidden md:block"
        />
      )}
    </button>
  );
}

const REACTION_EMOJIS = ["❤️", "👍", "🙏", "🙌", "🔥"];

function ReactionPicker({
  onReact,
  currentUserId,
  reactions,
}: {
  onReact: (emoji: string) => void;
  currentUserId?: string;
  reactions: Reaction[];
}) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-100 overflow-x-auto max-w-full">
      {REACTION_EMOJIS.map((emoji) => {
        const hasReacted = reactions.some(
          (r) => r.userId === currentUserId && r.emoji === emoji,
        );
        return (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onReact(emoji);
            }}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-125 shrink-0",
              hasReacted ? "bg-indigo-100" : "hover:bg-white",
            )}
          >
            <span className="text-sm">{emoji}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReactionDisplay({
  reactions,
  allUsers,
}: {
  reactions: Reaction[];
  allUsers: User[];
}) {
  if (reactions.length === 0) return null;

  // Group by emoji
  const grouped = reactions.reduce(
    (acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      acc[r.emoji].push(r);
      return acc;
    },
    {} as Record<string, Reaction[]>,
  );

  return (
    <div className="space-y-3 mt-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(grouped).map(([emoji, rs]) => (
          <div
            key={emoji}
            className="flex items-center gap-1 bg-white border border-gray-100 px-2 py-1 rounded-full shadow-sm group relative"
          >
            <span className="text-xs">{emoji}</span>
            <span className="text-[10px] font-bold text-gray-500">
              {rs.length}
            </span>

            {/* Tooltip with names */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-xl">
                {rs
                  .map(
                    (r) =>
                      allUsers.find((u) => u.uid === r.userId)?.displayName,
                  )
                  .join(", ")}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* List of users who reacted */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest w-full mb-1">
          Voluntários que reagiram:
        </p>
        {reactions.map((r) => {
          const u = allUsers.find((user) => user.uid === r.userId);
          if (!u) return null;
          return (
            <div
              key={r.id}
              className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100"
            >
              <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                {u.displayName[0]}
              </div>
              <span className="text-[10px] font-medium text-gray-600">
                {u.displayName.split(" ")[0]}
              </span>
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
  onCheckIn: (id: string, s: "PRESENTE" | "AUSENTE" | "ATRASADO") => void;
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

function EventCard({
  event,
  onCheckIn,
  userCheckIn,
  isAdmin,
  onEdit,
  onDelete,
  onDuplicate,
  compact,
  reactions,
  onReaction,
  currentUserId,
  allUsers,
  checkins,
}: EventCardProps) {
  const checkedInUsers = checkins.filter(
    (c) => c.eventId === event.id && c.status === "PRESENTE",
  );

  if (compact) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                event.type === "CULTO"
                  ? "bg-blue-600 text-white"
                  : event.type === "ENSAIO"
                    ? "bg-amber-500 text-white"
                    : "bg-rose-900 text-white",
              )}
            >
              {event.type}
            </span>
            <h4 className="text-sm font-bold text-gray-900 truncate">
              {event.title}
            </h4>
          </div>
          <p className="text-[10px] text-gray-500 flex items-center gap-1">
            <CalendarIcon size={10} /> {formatDate(event.date)}
          </p>

          {checkedInUsers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {checkedInUsers.map((c) => {
                const u = allUsers.find((user) => user.uid === c.userId);
                return (
                  <div
                    key={c.id}
                    className="bg-green-50 text-green-700 text-[7px] font-bold px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-0.5"
                  >
                    <CheckCircle size={7} /> {u?.displayName.split(" ")[0]}
                  </div>
                );
              })}
            </div>
          )}

          <ReactionDisplay reactions={reactions} allUsers={allUsers} />
        </div>
        <div className="flex items-center gap-2">
          <div className="transition-opacity">
            <ReactionPicker
              onReact={onReaction}
              currentUserId={currentUserId}
              reactions={reactions}
            />
          </div>
          {isAdmin && onDuplicate && (
            <button
              onClick={onDuplicate}
              className="p-2 text-gray-400 hover:text-indigo-600 transition-opacity"
              title="Duplicar"
            >
              <Plus size={16} />
            </button>
          )}
          {userCheckIn ? (
            <div className="text-green-600">
              <CheckCircle size={16} />
            </div>
          ) : (
            <button
              onClick={() => onCheckIn(event.id, "PRESENTE")}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
            >
              <CheckCircle size={16} />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group overflow-visible">
      {/* Accent bar with wine color */}
      <div
        className={cn(
          "absolute top-0 left-0 w-full h-1.5 rounded-t-3xl",
          event.type === "CULTO"
            ? "bg-blue-600"
            : event.type === "ENSAIO"
              ? "bg-sky-400"
              : "bg-rose-900",
        )}
      />

      <div className="flex justify-between items-start mb-4">
        <span
          className={cn(
            "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
            event.type === "CULTO"
              ? "bg-blue-100 text-blue-700"
              : event.type === "ENSAIO"
                ? "bg-sky-100 text-sky-700"
                : "bg-rose-100 text-rose-900",
          )}
        >
          {event.type}
        </span>
        {isAdmin && (
          <div className="flex gap-1 transition-opacity">
            <button
              onClick={onDuplicate}
              className="p-1 text-gray-400 hover:text-indigo-600"
              title="Duplicar"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-indigo-600"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      <h4 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h4>
      <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
        <CalendarIcon size={12} /> {formatDate(event.date)}
      </p>

      {checkedInUsers.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Presença Confirmada:
          </p>
          <div className="flex flex-wrap gap-2">
            {checkedInUsers.map((c) => {
              const u = allUsers.find((user) => user.uid === c.userId);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-lg border border-green-100"
                >
                  <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-[8px] font-bold text-green-600">
                    {u?.displayName[0]}
                  </div>
                  <span className="text-[10px] font-medium text-green-800">
                    {u?.displayName.split(" ")[0]}
                  </span>
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
          <ReactionPicker
            onReact={onReaction}
            currentUserId={currentUserId}
            reactions={reactions}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {userCheckIn ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={16} />{" "}
              <span className="text-xs font-bold uppercase">
                {userCheckIn.status}
              </span>
            </div>
          ) : (
            <button
              onClick={() => onCheckIn(event.id, "PRESENTE")}
              className="w-full sm:w-auto px-4 bg-indigo-50 text-indigo-600 text-[10px] font-bold py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-colors uppercase"
            >
              Check-in
            </button>
          )}
        </div>
      </div>
      {(currentUserId && allUsers) && (() => {
        const currentUser = allUsers.find(u => u.uid === currentUserId);
        if (currentUser) {
           return <EventComments eventId={event.id} user={currentUser} isAdmin={isAdmin} />;
        }
        return null;
      })()}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  isDarkMode = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  isDarkMode?: boolean;
}) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200",
          isDarkMode ? "bg-slate-800 text-white" : "bg-white",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "p-6 border-b flex justify-between items-center",
            isDarkMode ? "border-slate-700" : "border-gray-100",
          )}
        >
          <h3
            className={cn(
              "text-xl font-bold",
              isDarkMode ? "text-white" : "text-gray-900",
            )}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-xl",
              isDarkMode
                ? "text-gray-400 hover:bg-slate-700"
                : "text-gray-400 hover:bg-gray-50",
            )}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function EventForm({
  initialData,
  onSave,
  theme = "indigo",
}: {
  initialData: ChurchEvent | null;
  onSave: (data: any) => void;
  theme?: string;
}) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    date: initialData?.date || "",
    type: initialData?.type || "CULTO",
    description: initialData?.description || "",
    isRecurring: initialData?.isRecurring || false,
    frequency: initialData?.frequency || "WEEKLY",
    daysOfWeek: initialData?.daysOfWeek || [],
    durationMonths: 3,
    autoSchedule: false,
  });

  const toggleDay = (day: number) => {
    const newDays = formData.daysOfWeek.includes(day)
      ? formData.daysOfWeek.filter((d) => d !== day)
      : [...formData.daysOfWeek, day];
    setFormData({ ...formData, daysOfWeek: newDays });
  };

  const themeBg = "bg-primary hover:opacity-90 text-white " + (theme === "sunflower_yellow" ? "text-slate-900" : "");
  
  const themeText = "text-primary";
  
  const themeBgLight = "bg-primary/10";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Título
        </label>
        <input
          type="text"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Data e Hora
          </label>
          <input
            type="datetime-local"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Tipo
          </label>
          <select
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as any })
            }
          >
            <option value="CULTO">CULTO</option>
            <option value="ENSAIO">ENSAIO</option>
            <option value="REUNIAO">REUNIAO</option>
          </select>
        </div>
      </div>

      <div className={cn("p-4 rounded-2xl space-y-3", themeBgLight)}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className={cn("w-4 rounded", themeText)}
            checked={formData.isRecurring}
            onChange={(e) =>
              setFormData({ ...formData, isRecurring: e.target.checked })
            }
          />
          <span className={cn("text-sm font-bold", themeText)}>
            Evento Recorrente
          </span>
        </label>

        {formData.isRecurring && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex gap-1">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-[10px] font-bold transition-all",
                    formData.daysOfWeek.includes(i)
                      ? themeBg + " text-white"
                      : "bg-white text-gray-400 border border-gray-200",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div>
              <label
                className={cn(
                  "block text-[10px] font-bold uppercase mb-1",
                  themeText,
                )}
              >
                Duração (meses)
              </label>
              <input
                type="number"
                min="1"
                max="12"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
                value={formData.durationMonths}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    durationMonths: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                className={cn("w-4 rounded", themeText)}
                checked={formData.autoSchedule}
                onChange={(e) =>
                  setFormData({ ...formData, autoSchedule: e.target.checked })
                }
              />
              <span className="text-[10px] font-bold text-gray-600 uppercase">
                Auto-gerar escalas para todas as ocorrências
              </span>
            </label>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Descrição
        </label>
        <textarea
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          rows={2}
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>
      <button
        onClick={() => onSave(formData)}
        className={cn(
          "w-full text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2",
          themeBg,
        )}
      >
        <Save size={20} /> Salvar Evento
      </button>
    </div>
  );
}

function NotificationForm({
  users,
  onSave,
  theme = "indigo",
}: {
  users: User[];
  onSave: (data: any) => void;
  theme?: string;
}) {
  const [formData, setFormData] = useState({
    userId: "all",
    title: "",
    message: "",
  });
  const themeBg = "bg-primary hover:opacity-90 text-white " + (theme === "sunflower_yellow" ? "text-slate-900" : "");

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Para
        </label>
        <select
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
        >
          <option value="all">Todos os Voluntários</option>
          {users.map((u) => (
            <option key={u.uid} value={u.uid}>
              {u.displayName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Título
        </label>
        <input
          type="text"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Mensagem
        </label>
        <textarea
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          rows={3}
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
        />
      </div>
      <button
        onClick={() => onSave(formData)}
        className={cn(
          "w-full text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all",
          themeBg,
        )}
      >
        <Send size={20} /> Enviar
      </button>
    </div>
  );
}

function AnnouncementForm({
  onSave,
  initialData,
  theme = "indigo",
}: {
  onSave: (data: any) => void;
  initialData?: Announcement | null;
  theme?: string;
}) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    date: initialData?.date || "",
    time: initialData?.time || "",
    description: initialData?.description || "",
    pdfUrl: initialData?.pdfUrl || "",
    externalLink: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const themeBg = "bg-primary hover:opacity-90 text-white " + (theme === "sunflower_yellow" ? "text-slate-900" : "");
  const themeText = "text-primary";
  const themeBgLight = "bg-primary/10";

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

        const storageRef = ref(
          storage,
          `announcements/${Date.now()}_${file.name}`,
        );

        // Use simpler uploadBytes for better reliability if resumable fails
        try {
          const snapshot = await uploadBytes(storageRef, file);
          console.log("Upload concluído via uploadBytes");
          pdfUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadErr) {
          console.warn("uploadBytes falhou, tentando resumable...", uploadErr);

          const uploadTask = uploadBytesResumable(storageRef, file);
          const uploadPromise = new Promise((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const progress =
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
                toast.loading(`Enviando PDF... ${Math.round(progress)}%`, {
                  id: toastId,
                });
              },
              (error) => reject(error),
              () => resolve(uploadTask),
            );
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => {
              uploadTask.cancel();
              reject(new Error("Tempo de upload esgotado (5 min)."));
            }, 300000),
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
      toast.error(
        error.message || "Erro ao enviar arquivo. Verifique as permissões.",
        { id: toastId },
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <input
        placeholder="Título"
        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-4">
        <input
          type="date"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
        <input
          type="time"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
        />
      </div>
      <textarea
        placeholder="Descrição"
        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
        rows={3}
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
      />

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Anexar PDF ou Link Externo
        </label>
        <div className="space-y-2">
          <input
            type="file"
            accept=".pdf"
            className="w-full p-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div className="flex items-center gap-2">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-[10px] font-bold text-gray-400">OU</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>
          <input
            placeholder="Link do documento (Google Drive, Dropbox, etc)"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            value={formData.externalLink}
            onChange={(e) =>
              setFormData({ ...formData, externalLink: e.target.value })
            }
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isUploading}
        className={cn(
          "w-full text-white font-bold py-4 rounded-2xl disabled:opacity-50 transition-all",
          themeBg,
        )}
      >
        {isUploading ? "Enviando..." : "Publicar Anúncio"}
      </button>
    </div>
  );
}

function VolunteerForm({
  initialData,
  onSave,
  theme = "indigo",
}: {
  initialData: User | null;
  onSave: (data: any) => void;
  theme?: string;
}) {
  const [formData, setFormData] = useState({
    displayName: initialData?.displayName || "",
    email: initialData?.email || "",
    role: initialData?.role || "VOLUNTARIO",
    specialty: initialData?.specialty || "",
    status: initialData?.status || "pending",
    photoURL: initialData?.photoURL || "",
    birthDate: initialData?.birthDate || "",
    phone: initialData?.phone || "",
    maxScalesPerMonth: (initialData?.maxScalesPerMonth !== undefined && initialData?.maxScalesPerMonth !== null) ? initialData?.maxScalesPerMonth.toString() : "",
    availableDays: initialData?.availableDays || [0, 1, 2, 3, 4, 5, 6],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const DAYS_OF_WEEK = [
    { id: 0, label: "Dom" },
    { id: 1, label: "Seg" },
    { id: 2, label: "Ter" },
    { id: 3, label: "Qua" },
    { id: 4, label: "Qui" },
    { id: 5, label: "Sex" },
    { id: 6, label: "Sáb" },
  ];

  const PROFILE_EMOJIS = [
    "🧑",
    "👩",
    "👱‍♂️",
    "👱‍♀️",
    "🧔",
    "👨‍🦲",
    "👩‍🦲",
    "👨‍🦳",
    "👩‍🦳",
    "🐼",
    "🦊",
    "🦁",
    "🐵",
    "🦄",
    "👽",
    "👾",
    "🤖",
    "😎",
    "🤓",
    "🤠",
    "🎸",
    "🥁",
    "🎹",
    "🎤",
    "🎧",
    "📷",
    "🎥",
    "✝️",
    "🔥",
    "🕊️",
  ];

  const handleEmojiSelect = (emoji: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    setFormData((prev) => ({ ...prev, photoURL: url }));
    setShowEmojiPicker(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Enviando foto...");
    try {
      const storageRef = ref(
        storage,
        `profiles/temp_${Date.now()}_${file.name}`,
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData((prev) => ({ ...prev, photoURL: url }));
      toast.success("Foto enviada com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
      toast.error("Erro ao enviar foto.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const themeBg = "bg-primary hover:opacity-90 text-white " + (theme === "sunflower_yellow" ? "text-slate-900" : "");

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Nome Completo
        </label>
        <input
          type="text"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
          value={formData.displayName}
          onChange={(e) =>
            setFormData({ ...formData, displayName: e.target.value })
          }
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          E-mail
        </label>
        <input
          type="email"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Função / Especialidade
        </label>
        <input
          type="text"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
          value={formData.specialty}
          onChange={(e) =>
            setFormData({ ...formData, specialty: e.target.value })
          }
          placeholder="Ex: Fotografia, Transmissão, Som..."
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Foto de Perfil
        </label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <label className="flex-1 cursor-pointer bg-gray-50 border border-gray-200 border-dashed rounded-xl p-3 text-center hover:bg-gray-100 transition-colors">
              <span className="text-sm text-gray-600 flex items-center justify-center gap-2">
                <Upload size={16} /> Escolher arquivo
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={isUploading}
              />
            </label>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              title="Escolher Emoji"
            >
              😀
            </button>
            {formData.photoURL && (
              <button
                onClick={() =>
                  setFormData((prev) => ({ ...prev, photoURL: "" }))
                }
                className="p-3 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                title="Remover foto"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {showEmojiPicker && (
            <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                Escolha um emoji
              </p>
              <div className="flex flex-wrap gap-2">
                {PROFILE_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Data de Nascimento
          </label>
          <input
            type="date"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
            value={formData.birthDate}
            onChange={(e) =>
              setFormData({ ...formData, birthDate: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            WhatsApp
          </label>
          <input
            type="tel"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Cargo
          </label>
          <select
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
            value={formData.role}
            onChange={(e) =>
              setFormData({ ...formData, role: e.target.value as any })
            }
          >
            <option value="VOLUNTARIO">VOLUNTÁRIO</option>
            <option value="LIDER_II">LÍDER II</option>
            <option value="LIDER_I">LÍDER I</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Status
          </label>
          <select
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as any })
            }
          >
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Especialidade / Funções
        </label>
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[50px]">
          {ROLES.map((r) => {
            const isSelected = formData.specialty
              ?.split(",")
              .map((s) => s.trim())
              .includes(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  const current = formData.specialty
                    ? formData.specialty
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : [];
                  const updated = current.includes(r)
                    ? current.filter((s) => s !== r)
                    : [...current, r];
                  setFormData({ ...formData, specialty: updated.join(", ") });
                }}
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-full transition-all border",
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600",
                )}
              >
                {isSelected ? "✓ " : "+ "} {r}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-6 mt-6">
        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarDays size={18} className="text-indigo-600" />
          Disponibilidade para Escalas
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Dias da Semana Disponíveis
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = formData.availableDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => {
                        const newDays = isSelected
                          ? prev.availableDays.filter((d) => d !== day.id)
                          : [...prev.availableDays, day.id].sort();
                        return { ...prev, availableDays: newDays };
                      });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                      isSelected
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Limite de Escalas por Mês
            </label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="Ex: 2 (Deixe em branco para ilimitado)"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
              value={formData.maxScalesPerMonth}
              onChange={(e) =>
                setFormData({ ...formData, maxScalesPerMonth: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => onSave({
          ...formData,
          maxScalesPerMonth: formData.maxScalesPerMonth ? parseInt(formData.maxScalesPerMonth, 10) : null
        })}
        disabled={isUploading}
        className={cn(
          "w-full text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50",
          themeBg,
        )}
      >
        {isUploading
          ? "Enviando foto..."
          : initialData
            ? "Atualizar"
            : "Cadastrar"}
      </button>
    </div>
  );
}

const ROLES = [
  "Som",
  "Câmera",
  "Projeção",
  "Mídia",
  "Vídeo",
  "Fotos",
  "Cantina",
  "Doces",
  "Iluminação",
  "Recepção",
  "Café",
  "Placas",
  "Anúncios",
  "Outros",
];

function ScaleForm({
  event,
  users,
  initialScale,
  onSave,
  allScales,
  allEvents,
  theme = "indigo",
}: {
  event: ChurchEvent;
  users: User[];
  initialScale?: Scale;
  onSave: (assignments: any[]) => void;
  allScales: Scale[];
  allEvents: ChurchEvent[];
  theme?: string;
}) {
  const [assignments, setAssignments] = useState<any[]>(
    (initialScale?.assignments || []).filter(a => a.userId && a.userId !== "EMPTY")
  );
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const themeBg = "bg-primary hover:opacity-90 text-white " + (theme === "sunflower_yellow" ? "text-slate-900" : "");
  const themeText = "text-primary";
  const themeBgLight = "bg-primary/10";

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
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
    const existingIndex = assignments.findIndex((a) => a.userId === selectedUser);
    if (existingIndex !== -1) {
      const newAssignments = [...assignments];
      const mergedRoles = Array.from(new Set([...(newAssignments[existingIndex].roles || []), ...(newAssignments[existingIndex].role ? [newAssignments[existingIndex].role] : []), ...selectedRoles]));
      newAssignments[existingIndex] = { ...newAssignments[existingIndex], roles: mergedRoles };
      setAssignments(newAssignments);
      toast.success("Mais funções atribuídas a este voluntário!");
    } else {
      setAssignments([
        ...assignments,
        { userId: selectedUser, roles: selectedRoles },
      ]);
    }
    setSelectedUser("");
    setSelectedRoles([]);
  };

  const autoSchedule = () => {
    const rolesToAssign = [
      "Som",
      "Câmera",
      "Projeção",
      "Mídia",
      "Vídeo",
      "Fotos",
      "Cantina",
      "Doces",
      "Iluminação",
      "Recepção",
      "Café",
      "Placas",
      "Anúncios",
    ];
    const newAssignments: any[] = [];
    const usedUserIds = new Set<string>();

    const normalizeString = (str: string) => {
      return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    };

    const activeRoles = rolesToAssign.filter((role) => 
      users.some((u) => u.status === "approved" && normalizeString(u.specialty || "").includes(normalizeString(role)))
    );

    const userParticipation: Record<string, number> = {};
    users.forEach((u) => {
      userParticipation[u.uid] = allScales.reduce(
        (acc, s) =>
          acc + s.assignments.filter((a) => a.userId === u.uid).length,
        0,
      );
    });

    // Add existing explicit assignments that we want to preserve
    assignments.forEach((a) => {
      if (a.userId && a.userId !== "EMPTY") {
        newAssignments.push(a);
        usedUserIds.add(a.userId);
      }
    });

    activeRoles.forEach((role) => {
      // Skip if this role is already assigned manually
      if (
        newAssignments.some(
          (a) => (a.roles || []).includes(role) || a.role === role,
        )
      ) {
        return;
      }

      let eligibleUsers = users.filter((u) => {
        if (u.status !== "approved" || usedUserIds.has(u.uid)) return false;
        if (!normalizeString(u.specialty || "").includes(normalizeString(role))) return false;
        
        // We can also check availability here if we want, similar to performAutoSchedule
        const eventDate = new Date(event.date);
        const eventDayOfWeek = eventDate.getDay();
        const eventMonth = eventDate.getMonth();
        const eventYear = eventDate.getFullYear();

        if (u.availableDays && u.availableDays.length > 0 && !u.availableDays.includes(eventDayOfWeek)) {
          return false;
        }

        if (u.maxScalesPerMonth && u.maxScalesPerMonth > 0) {
          // Count how many scales this user has this month
          let userScalesThisMonth = 0;
          allScales.forEach((scale) => {
            const scaleEvent = allEvents.find((e) => e.id === scale.eventId);
            if (scaleEvent) {
              const sDate = new Date(scaleEvent.date);
              if (sDate.getMonth() === eventMonth && sDate.getFullYear() === eventYear) {
                if (scale.assignments.some(a => a.userId === u.uid)) {
                  userScalesThisMonth++;
                }
              }
            }
          });
          if (userScalesThisMonth >= u.maxScalesPerMonth) {
            return false;
          }
        }

        return true;
      });

      if (eligibleUsers.length > 0) {
        eligibleUsers.sort(
          (a, b) =>
            (userParticipation[a.uid] || 0) - (userParticipation[b.uid] || 0),
        );
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
      .filter((e) => e.type === event.type && e.id !== event.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sameTypeEvents.length > 0) {
      const prevScale = allScales.find(
        (s) => s.eventId === sameTypeEvents[0].id,
      );
      if (prevScale && prevScale.assignments.length > 0) {
        setAssignments(prevScale.assignments);
        toast.success(`Escala copiada de "${sameTypeEvents[0].title}"`);
        return;
      }
    }
    toast.error("Nenhuma escala anterior encontrada para este tipo de evento.");
  };

  const [selectedForRemoval, setSelectedForRemoval] = useState<number[]>([]);

  const toggleRemovalSelection = (index: number) => {
    if (selectedForRemoval.includes(index)) {
      setSelectedForRemoval(selectedForRemoval.filter((i) => i !== index));
    } else {
      setSelectedForRemoval([...selectedForRemoval, index]);
    }
  };

  const removeSelected = () => {
    setAssignments(
      assignments.filter((_, idx) => !selectedForRemoval.includes(idx)),
    );
    setSelectedForRemoval([]);
  };

  const handleQuickSwap = (index: number, newUserId: string) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], userId: newUserId };
    setAssignments(newAssignments);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={autoSchedule}
          className={cn(
            "flex-1 font-bold py-3 rounded-xl border transition-all flex items-center justify-center gap-2",
            themeBgLight,
            themeText,
            "border-current border-opacity-20",
          )}
        >
          <Sparkles size={18} /> Sugerir Escala
        </button>
        <button
          onClick={duplicatePreviousScale}
          className={cn(
            "flex-1 font-bold py-3 rounded-xl border transition-all flex items-center justify-center gap-2",
            themeBgLight,
            themeText,
            "border-current border-opacity-20",
          )}
        >
          <Plus size={18} /> Repetir Anterior
        </button>
      </div>

      <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Adicionar Voluntário
        </p>
        <select
          className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="">Selecionar Voluntário</option>
          {users.map((u) => (
            <option key={u.uid} value={u.uid}>
              {u.displayName}
            </option>
          ))}
        </select>

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
            Funções (Até 4):
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => toggleRole(role)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                  selectedRoles.includes(role)
                    ? cn(themeBg, "text-white border-transparent")
                    : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300",
                )}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={addAssignment}
          className={cn(
            "w-full text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2",
            themeBg,
          )}
        >
          <Plus size={18} /> Adicionar à Escala
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Escala Atual
          </p>
          {selectedForRemoval.length > 0 && (
            <button
              onClick={removeSelected}
              className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} /> Remover Selecionados (
              {selectedForRemoval.length})
            </button>
          )}
        </div>
        {assignments.filter(a => a.userId && a.userId !== "EMPTY").map((a, i) => {
          const u = users.find((user) => user.uid === a.userId);
          const currentRoles = a.roles || [a.role];

          // Find compatible users for the first role in their set
          const roleTocheck = currentRoles[0] || "";
          const compatibleUsers = users.filter(
            (user) =>
              user.status === "approved" &&
              user.uid !== a.userId &&
              user.specialty?.toLowerCase().includes(roleTocheck.toLowerCase()),
          );

          return (
            <div
              key={i}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-2xl border shadow-sm animate-in fade-in slide-in-from-left-2 duration-200 gap-4",
                "border-gray-100",
                selectedForRemoval.includes(i) ? "ring-2 ring-red-400" : "",
              )}
            >
              <div className="flex items-start sm:items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedForRemoval.includes(i)}
                  onChange={() => toggleRemovalSelection(i)}
                  className="mt-1 sm:mt-0 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-inner text-sm shrink-0",
                    "bg-indigo-50 text-indigo-600",
                  )}
                >
                  {u?.displayName?.[0] || ""}
                </div>
                <div className="flex flex-col">
                  <p
                    className={cn(
                      "text-sm font-bold",
                      "text-gray-900",
                    )}
                  >
                    {u?.displayName}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentRoles.filter(Boolean).map((r: string) => (
                      <span
                        key={r}
                        className={cn(
                          "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                          "bg-indigo-50 text-indigo-600",
                        )}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  className="flex-1 sm:w-32 text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value=""
                  onChange={(e) => handleQuickSwap(i, e.target.value)}
                >
                  <option value="" disabled>
                    Trocar...
                  </option>
                  {compatibleUsers.map((compUser) => (
                    <option key={compUser.uid} value={compUser.uid}>
                      {compUser.displayName}
                    </option>
                  ))}
                  {compatibleUsers.length === 0 && (
                    <option disabled>Nenhum voluntário apto</option>
                  )}
                </select>
                <button
                  onClick={() =>
                    setAssignments(assignments.filter((_, idx) => idx !== i))
                  }
                  className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {assignments.length === 0 && (
          <p className="text-center text-gray-400 text-sm italic py-4">
            Nenhum voluntário escalado.
          </p>
        )}
      </div>
      <button
        onClick={() => onSave(assignments)}
        className={cn(
          "w-full text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2",
          themeBg,
        )}
      >
        <Save size={20} /> Salvar Escala
      </button>
    </div>
  );
}

function CalendarView({
  events,
  scales,
  allUsers,
  isAdmin,
  user,
  setSelectedEventForScale,
  setIsScaleModalOpen,
  calendarFilterType,
  setCalendarFilterType,
  calendarFilterStatus,
  setCalendarFilterStatus
}: {
  events: ChurchEvent[];
  scales: Scale[];
  allUsers: User[];
  isAdmin: boolean;
  user: any;
  setSelectedEventForScale: (e: ChurchEvent) => void;
  setIsScaleModalOpen: (b: boolean) => void;
  calendarFilterType: string;
  setCalendarFilterType: (v: string) => void;
  calendarFilterStatus: string;
  setCalendarFilterStatus: (v: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const filteredEvents = events
    .filter((e) => calendarFilterType === 'all' || e.type === calendarFilterType)
    .filter((e) => {
      if (calendarFilterStatus === 'all') return true;
      const isPast = new Date(e.date) < new Date(new Date().setHours(0, 0, 0, 0));
      if (calendarFilterStatus === 'CONCLUIDO') return isPast;
      if (calendarFilterStatus === 'AGENDADO') return !isPast;
      return true;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <select 
          className="text-sm p-2 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          value={calendarFilterType}
          onChange={(e) => setCalendarFilterType(e.target.value)}
        >
          <option value="all">Todos os Tipos</option>
          <option value="CULTO">Culto</option>
          <option value="ENSAIO">Ensaio</option>
          <option value="REUNIAO">Reunião</option>
        </select>
        <select 
          className="text-sm p-2 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          value={calendarFilterStatus}
          onChange={(e) => setCalendarFilterStatus(e.target.value)}
        >
          <option value="all">Todo o Período</option>
          <option value="AGENDADO">Somente Agendados</option>
          <option value="CONCLUIDO">Somente Concluídos</option>
        </select>
      </div>
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
        <div>
          <h3 className="text-xl font-bold text-gray-900 capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h3>
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">
            Planejamento Mensal
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-white bg-white/50 rounded-xl transition-colors shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-white bg-white/50 rounded-xl transition-colors shadow-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div
            key={day}
            className="py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dayEvents = filteredEvents.filter((e) =>
            isSameDay(new Date(e.date), day),
          );
          const isCurrentMonth = isSameMonth(day, monthStart);

          return (
            <div
              key={i}
              onClick={() => dayEvents.length > 0 && setSelectedDate(day)}
              className={cn(
                "min-h-[140px] p-2 border-r border-b border-gray-50 transition-colors hover:bg-gray-50/50",
                !isCurrentMonth && "opacity-25",
                dayEvents.length > 0 && "cursor-pointer"
              )}
            >
              <span
                className={cn(
                  "text-xs font-bold mb-2 block w-6 h-6 flex items-center justify-center rounded-lg",
                  isSameDay(day, new Date())
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "text-gray-400",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="space-y-1.5">
                {dayEvents.map((e) => {
                  const scale = scales.find((s) => s.eventId === e.id);
                  const volunteers = scale?.assignments
                    .map(
                      (a) =>
                        allUsers
                          .find((u) => u.uid === a.userId)
                          ?.displayName.split(" ")[0],
                    )
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <div
                      key={e.id}
                      className={cn(
                        "px-2 py-1.5 rounded-lg text-[9px] font-bold border-l-2 shadow-sm",
                        e.type === "CULTO"
                          ? "bg-blue-50 text-blue-700 border-blue-600"
                          : e.type === "ENSAIO"
                            ? "bg-sky-50 text-sky-700 border-sky-400"
                            : "bg-rose-50 text-rose-900 border-rose-900",
                      )}
                    >
                      <div className="flex justify-between items-center mb-0.5">
                        <span>
                          {format(new Date(e.date), "HH:mm")} {e.title}
                        </span>
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

      {selectedDate && (
        <Modal 
          title={`Atividades: ${format(selectedDate, "dd/MM/yyyy")}`}
          onClose={() => setSelectedDate(null)}
          isDarkMode={false}
        >
          <div className="space-y-4">
            {events
              .filter((e) => isSameDay(new Date(e.date), selectedDate))
              .map((e) => {
                const scale = scales.find((s) => s.eventId === e.id);
                return (
                  <div key={e.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="font-bold text-gray-900">{format(new Date(e.date), "HH:mm")} - {e.title}</h4>
                       <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          e.type === "CULTO"
                            ? "bg-blue-100 text-blue-700"
                            : e.type === "ENSAIO"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-rose-100 text-rose-900"
                        )}>
                          {e.type}
                        </span>
                    </div>
                    {e.description && <p className="text-sm text-gray-600 mb-4">{e.description}</p>}
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Equipe Escalada</p>
                      {scale && scale.assignments.filter(a => a.userId && a.userId !== "EMPTY").length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {scale.assignments.filter(a => a.userId && a.userId !== "EMPTY").map((a, i) => {
                            const user = allUsers.find(u => u.uid === a.userId);
                            return (
                              <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                <span className={cn("text-xs font-bold", "text-gray-900")}>
                                  {user?.displayName}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded uppercase tracking-tighter">
                                  {(a.roles || [(a as any).role]).filter(Boolean).join(', ')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Ninguém escalado ainda.</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => {
                            setSelectedDate(null);
                            setSelectedEventForScale(e);
                            setIsScaleModalOpen(true);
                          }}
                          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all uppercase"
                        >
                          Editar Escalas
                        </button>
                      </div>
                    )}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      {user && <EventComments eventId={e.id} user={user} isAdmin={isAdmin} />}
                    </div>
                  </div>
                );
              })}
          </div>
        </Modal>
      )}
    </div>
    </div>
  );
}

function SetlistForm({
  initialTitle,
  initialContent,
  onSave,
}: {
  initialTitle: string;
  initialContent: string;
  onSave: (title: string, content: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(title, content);
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Título do Setlist
        </label>
        <input
          type="text"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Culto de Domingo - 15/10"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Conteúdo
        </label>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <ReactQuill
            theme="snow"
            value={content}
            onChange={setContent}
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Save size={20} />
        {isSaving ? "Salvando..." : "Salvar Setlist"}
      </button>
    </div>
  );
}

function SetlistView({
  setlists,
  isAdmin,
  theme,
  setViewingSetlist,
  users,
}: {
  setlists: Setlist[];
  isAdmin: boolean;
  theme: string;
  setViewingSetlist: (s: Setlist) => void;
  users: User[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);

  const handleSave = async (title: string, content: string) => {
    if (!title || !content) {
      toast.error("Título e conteúdo são obrigatórios.");
      return;
    }

    try {
      if (editingSetlist) {
        await updateDoc(doc(db, "setlists", editingSetlist.id), {
          title,
          content,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Setlist atualizado!");
      } else {
        await addDoc(collection(db, "setlists"), {
          title,
          content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success("Setlist criado!");
        
        // Broadcast notification to all users
        let notifCount = 0;
        for (const u of users) {
          await addDoc(collection(db, "notifications"), {
            userId: u.uid,
            title: "Novo Setlist de Louvor",
            message: `O setlist "${title}" foi publicado.`,
            read: false,
            createdAt: new Date().toISOString()
          });
          notifCount++;
        }
        if(notifCount > 0) toast.success(`Notificação enviada a ${notifCount} voluntários!`);

      }
      setIsModalOpen(false);
      setEditingSetlist(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "setlists");
    }
  };

  const themeBg = "bg-primary hover:opacity-90 text-white shadow-sm " + (theme === "sunflower_yellow" ? "text-slate-900" : "");
  const themeTextHov = "group-hover:text-primary";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Músicas e Louvor</h3>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingSetlist(null);
              setIsModalOpen(true);
            }}
            className={cn("text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg transition-colors", themeBg)}
          >
            <Plus size={16} /> Novo Setlist
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {setlists.map((s) => (
          <div
            key={s.id}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
            onClick={() => setViewingSetlist(s)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className={cn("font-bold text-gray-900 text-lg transition-colors", themeTextHov)}>
                  {s.title}
                </h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Atualizado em {new Date(s.updatedAt).toLocaleDateString()}
                </p>
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSetlist(s);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await deleteDoc(doc(db, "setlists", s.id));
                        toast.success("Setlist excluído");
                      } catch (error) {
                        handleFirestoreError(
                          error,
                          OperationType.DELETE,
                          "setlists",
                        );
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <div
              className="prose prose-sm max-w-none text-gray-600 line-clamp-3"
              dangerouslySetInnerHTML={{ __html: s.content }}
            />
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Modal
          title={editingSetlist ? "Editar Setlist" : "Novo Setlist"}
          onClose={() => setIsModalOpen(false)}
        >
          <SetlistForm
             initialTitle={editingSetlist?.title || ""}
             initialContent={editingSetlist?.content || ""}
             onSave={handleSave}
          />
        </Modal>
      )}
    </div>
  );
}

function CronogramaForm({
  initialTitle,
  initialContent,
  initialLink,
  onSave,
}: {
  initialTitle: string;
  initialContent: string;
  initialLink: string;
  onSave: (title: string, content: string, externalLink: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [externalLink, setExternalLink] = useState(initialLink);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(title, content, externalLink);
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Título do Cronograma
        </label>
        <input
          type="text"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Culto da Vitória - 22/10"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Conteúdo (Opcional se houver link)
        </label>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <ReactQuill
            theme="snow"
            value={content}
            onChange={setContent}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Link Externo (Opcional)
        </label>
        <input
          type="text"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          value={externalLink}
          onChange={(e) => setExternalLink(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-blue-700 text-white font-bold py-4 rounded-2xl hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Save size={20} />
        {isSaving ? "Salvando..." : "Salvar Cronograma"}
      </button>
    </div>
  );
}

function CronogramaView({
  cronogramas,
  isAdmin,
  theme,
  setViewingCronograma,
  users,
}: {
  cronogramas: Cronograma[];
  isAdmin: boolean;
  theme: string;
  setViewingCronograma: (c: Cronograma) => void;
  users: User[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCronograma, setEditingCronograma] = useState<Cronograma | null>(
    null,
  );

  const handleSave = async (title: string, content: string, externalLink: string) => {
    if (!title || (!content && !externalLink)) {
      toast.error("Título e (conteúdo ou link) são obrigatórios.");
      return;
    }

    try {
      if (editingCronograma) {
        await updateDoc(doc(db, "cronogramas", editingCronograma.id), {
          title,
          content,
          externalLink,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Cronograma atualizado!");
      } else {
        await addDoc(collection(db, "cronogramas"), {
          title,
          content,
          externalLink,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success("Cronograma criado!");

        // Broadcast notification to all users
        let notifCount = 0;
        for (const u of users) {
          await addDoc(collection(db, "notifications"), {
            userId: u.uid,
            title: "Novo Cronograma Publicado",
            message: `Verifique o cronograma do culto: "${title}".`,
            read: false,
            createdAt: new Date().toISOString()
          });
          notifCount++;
        }
        if(notifCount > 0) toast.success(`Notificação enviada a ${notifCount} voluntários!`);

      }
      setIsModalOpen(false);
      setEditingCronograma(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "cronogramas");
    }
  };

  const generatePDF = async (c: Cronograma) => {
    const element = document.createElement("div");
    element.innerHTML = `
      <div style="background-color: #ffffff; color: #000000; font-family: Arial, Helvetica, sans-serif; padding: 15mm; width: 210mm; box-sizing: border-box;">
        <h1 style="color: #000000; font-size: 16pt; font-weight: bold; margin-bottom: 24px; text-align: center;">${c.title}</h1>
        <div style="color: #000000; font-size: 12pt; line-height: 1.5;">${c.content}</div>
        <div style="margin-top: 40px; font-size: 10pt; color: #000000; border-top: 1px solid #000000; padding-top: 10px; text-align: center;">
          Gerado em ${new Date().toLocaleString()} - IMW Laureano
        </div>
      </div>
    `;
    
    // Explicitly resetting any inherited dark mode classes to ensure children styling works fine internally
    Object.assign(element.style, {
      position: 'absolute',
      left: '-9999px',
      top: '-9999px',
      backgroundColor: '#ffffff'
    });
    element.className = ""; // Remove any 'dark' or 'glass' class

    // Quill uses strong inline styles but sometimes color inherits from body
    // Let's force all child text to be black.
    const styleSheet = document.createElement("style");
    styleSheet.innerText = "* { color: #000000 !important; background-color: transparent; }";
    element.appendChild(styleSheet);

    document.body.appendChild(element);

    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`cronograma-${c.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF.");
    } finally {
      document.body.removeChild(element);
    }
  };

  const themeBg = "bg-primary hover:opacity-90 text-white shadow-sm " + (theme === "sunflower_yellow" ? "text-slate-900" : "");
  const themeTextHov = "group-hover:text-primary";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Cronograma do Culto</h3>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingCronograma(null);
              setIsModalOpen(true);
            }}
            className={cn("text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg transition-colors", themeBg)}
          >
            <Plus size={16} /> Novo Cronograma
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {cronogramas.map((c) => (
          <div
            key={c.id}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
            onClick={() => setViewingCronograma(c)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className={cn("font-bold text-gray-900 text-lg transition-colors", themeTextHov)}>
                  {c.title}
                </h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Atualizado em {new Date(c.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    generatePDF(c);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
                >
                  <Download size={16} /> PDF
                </button>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCronograma(c);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await deleteDoc(doc(db, "cronogramas", c.id));
                          toast.success("Cronograma excluído");
                        } catch (error) {
                          handleFirestoreError(
                            error,
                            OperationType.DELETE,
                            "cronogramas",
                          );
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {c.content && (
              <div
                className="prose prose-sm max-w-none text-gray-600 mb-4 line-clamp-3"
                dangerouslySetInnerHTML={{ __html: c.content }}
              />
            )}
            {c.externalLink && (
              <a
                href={c.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline"
              >
                <ExternalLink size={16} /> Ver Link Externo
              </a>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Modal
          title={editingCronograma ? "Editar Cronograma" : "Novo Cronograma"}
          onClose={() => setIsModalOpen(false)}
        >
          <CronogramaForm
            initialTitle={editingCronograma?.title || ""}
            initialContent={editingCronograma?.content || ""}
            initialLink={editingCronograma?.externalLink || ""}
            onSave={handleSave}
          />
        </Modal>
      )}
    </div>
  );
}

function ProfileForm({
  user,
  onSave,
  theme,
}: {
  user: User;
  onSave: () => void;
  theme: string;
}) {
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    birthDate: user.birthDate || "",
    phone: user.phone || "",
    specialty: user.specialty || "",
    bg_color: user.bg_color || user.color || "#4F46E5",
    profile_emoji: user.profile_emoji || "",
    initials: user.initials || "",
    maxScalesPerMonth: (user.maxScalesPerMonth !== undefined && user.maxScalesPerMonth !== null) ? user.maxScalesPerMonth.toString() : "",
    availableDays: user.availableDays || [0, 1, 2, 3, 4, 5, 6],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const PROFILE_COLORS = [
    "#EF4444", "#F97316", "#F59E0B", "#10B981", "#06B6D4",
    "#3B82F6", "#6366F1", "#8B5CF6", "#D946EF", "#F43F5E"
  ];

  const DAYS_OF_WEEK = [
    { id: 0, label: "Dom" },
    { id: 1, label: "Seg" },
    { id: 2, label: "Ter" },
    { id: 3, label: "Qua" },
    { id: 4, label: "Qui" },
    { id: 5, label: "Sex" },
    { id: 6, label: "Sáb" },
  ];

  const PROFILE_EMOJIS = [
    // Rosto e Sentimentos
    "😀", "😎", "🤓", "😇", "🤠", "😜", "🤩", "🤔", "🤫", "🤬", "🤡", "👻", "👽", "👾", "🤖",
    // Variações de Pessoas
    "🧑", "👩", "👱‍♂️", "👱‍♀️", "🧔", "👨‍🦲", "👩‍🦲", "👨‍🦳", "👩‍🦳", "🧑‍🦱", "👩‍🦱", "🧑‍🦰", "👩‍🦰", 
    "👶", "👦", "👧", "👨", "👩", "🧓", "👴", "👵",
    // Animais
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🦄", "🐙", "🦖", "🦋",
    // Música e Mídia
    "🎸", "🥁", "🎹", "🎺", "🎻", "🎤", "🎧", "📻", "📷", "📸", "📹", "🎥", "🎬", "📺", "💻", "📱",
    // Igreja e Outros
    "⛪", "✝️", "🔥", "🕊️", "🙌", "🙏", "📖", "✨", "❤️", "⭐", "🎵", "🎶", "👑", "🛡️", "⚔️", "💡"
  ];

  const handleEmojiSelect = (emoji: string) => {
    setFormData((prev) => ({ ...prev, profile_emoji: emoji }));
    setShowEmojiPicker(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Enviando foto...");
    try {
      const storageRef = ref(storage, `profiles/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData((prev) => ({ ...prev, photoURL: url }));
      toast.success("Foto enviada com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
      toast.error("Erro ao enviar foto.", { id: toastId });
    }
  };

  useEffect(() => {
    if (formData.displayName && !formData.initials && !user.initials) {
      setFormData(prev => ({...prev, initials: prev.displayName.substring(0, 2).toUpperCase()}));
    }
  }, [formData.displayName, user.initials]);

  const handleSave = async () => {
    if (!formData.displayName) {
      toast.error("Nome é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: formData.displayName,
        photoURL: formData.photoURL,
        birthDate: formData.birthDate,
        phone: formData.phone,
        specialty: formData.specialty,
        bg_color: formData.bg_color,
        profile_emoji: formData.profile_emoji,
        initials: formData.initials,
        maxScalesPerMonth: formData.maxScalesPerMonth ? parseInt(formData.maxScalesPerMonth, 10) : null,
        availableDays: formData.availableDays,
        updatedAt: new Date().toISOString(),
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
    <div className="space-y-6 max-h-[80vh] overflow-y-auto hide-scrollbar px-2">
      <div className="flex flex-col items-center gap-4 relative">
        <div 
          className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden relative group flex items-center justify-center text-4xl font-bold"
          style={{ backgroundColor: formData.photoURL ? 'transparent' : formData.bg_color, color: 'white' }}
        >
          {formData.photoURL ? (
            <img
              src={formData.photoURL}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : formData.profile_emoji ? (
            formData.profile_emoji
          ) : (
             formData.initials || formData.displayName.substring(0, 2).toUpperCase()
          )}
          <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center gap-1 text-white">
            <Camera size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Foto
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
        </div>

        <div className="flex gap-2 relative">
          {formData.photoURL && (
            <button
              onClick={() => setFormData((prev) => ({ ...prev, photoURL: "" }))}
              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
            >
              Remover Foto
            </button>
          )}
          {!formData.photoURL && (
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Smile size={14} /> Emoji
            </button>
          )}

          {showEmojiPicker && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 p-4 bg-white border border-gray-100 rounded-xl shadow-lg w-full min-w-[280px] z-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Escolha um emoji</span>
                {formData.profile_emoji && (
                  <button 
                    onClick={() => handleEmojiSelect("")}
                    className="text-[10px] font-bold text-red-500 hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-h-48 overflow-y-auto hide-scrollbar">
                {PROFILE_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-50 rounded-lg transition-colors border border-gray-100",
                      formData.profile_emoji === emoji && "bg-indigo-50 border-indigo-200"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!formData.photoURL && (
           <div className="w-full mt-2">
             <label className="block text-xs font-bold text-center text-gray-400 uppercase tracking-widest mb-2">Cor de Fundo</label>
             <div className="flex flex-wrap justify-center gap-2">
               {PROFILE_COLORS.map(color => (
                 <button
                   key={color}
                   type="button"
                   onClick={() => setFormData(prev => ({...prev, bg_color: color}))}
                   className={cn(
                     "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                     formData.bg_color === color ? "border-gray-900 scale-110" : "border-transparent"
                   )}
                   style={{ backgroundColor: color }}
                 />
               ))}
             </div>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Nome Completo
          </label>
          <input
            type="text"
            className={cn(
              "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none",
              theme === "dark" && "bg-gray-800 border-gray-700 text-white",
            )}
            value={formData.displayName}
            onChange={(e) =>
              setFormData({ ...formData, displayName: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Iniciais (Para Avatar)
          </label>
          <input
            type="text"
            maxLength={2}
            className={cn(
              "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none uppercase font-bold",
              theme === "dark" && "bg-gray-800 border-gray-700 text-white",
            )}
            value={formData.initials}
            onChange={(e) =>
              setFormData({ ...formData, initials: e.target.value.toUpperCase() })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Data de Nascimento
          </label>
          <input
            type="date"
            className={cn(
              "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none",
              theme === "dark" && "bg-gray-800 border-gray-700 text-white",
            )}
            value={formData.birthDate}
            onChange={(e) =>
              setFormData({ ...formData, birthDate: e.target.value })
            }
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Função / Especialidade
          </label>
          <input
            type="text"
            placeholder="Ex: Fotografia, Transmissão, Som..."
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
            value={formData.specialty}
            onChange={(e) =>
              setFormData({ ...formData, specialty: e.target.value })
            }
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            WhatsApp
          </label>
          <input
            type="tel"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6 mt-6">
        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarDays size={18} className="text-indigo-600" />
          Disponibilidade para Escalas
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Dias da Semana Disponíveis
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = formData.availableDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    onClick={() => {
                      setFormData((prev) => {
                        const newDays = isSelected
                          ? prev.availableDays.filter((d) => d !== day.id)
                          : [...prev.availableDays, day.id].sort();
                        return { ...prev, availableDays: newDays };
                      });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                      isSelected
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">A IA não colocará você em eventos nos dias desmarcados.</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Limite de Escalas por Mês
            </label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="Ex: 2 (Deixe em branco para ilimitado)"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
              value={formData.maxScalesPerMonth}
              onChange={(e) =>
                setFormData({ ...formData, maxScalesPerMonth: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isSaving ? (
          "Salvando..."
        ) : (
          <>
            <Save size={20} /> Salvar Alterações
          </>
        )}
      </button>
    </div>
  );
}
