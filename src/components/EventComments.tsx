import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MessageSquare, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: any;
}

export default function EventComments({ eventId, user, isAdmin }: { eventId: string; user: any; isAdmin: boolean }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    // Create query
    const q = query(
      collection(db, "events", eventId, "comentarios"),
      orderBy("createdAt", "asc")
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    }, (error) => {
      console.error(error);
    });

    return () => unsub();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await addDoc(collection(db, "events", eventId, "comentarios"), {
        text: newComment.trim(),
        userId: user.uid,
        userName: user.displayName,
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
      toast.error('Erro ao adicionar comentário.');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, "events", eventId, "comentarios", commentId));
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  return (
    <div className="mt-4 space-y-4 flex flex-col p-4 bg-gray-50/50 rounded-2xl border border-gray-100 w-full mb-2">
      <div className="flex justify-between items-center px-1">
         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <MessageSquare size={12} /> Comentários
         </span>
         <span className="text-[10px] uppercase font-bold text-gray-400">{comments.length}</span>
      </div>

      <div className="flex-1 space-y-3 px-1">
        {comments.length === 0 && (
          <p className="text-[11px] text-center text-gray-400 italic py-2">Sem comentários para este evento.</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="bg-white border text-sm border-gray-100/60 p-3 rounded-2xl shadow-sm relative group flex items-start gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
               {c.userName[0]}
             </div>
             <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-900 text-[11px]">{c.userName}</span>
                  <span className="text-[9px] text-gray-400">
                    {c.createdAt?.toDate ? format(c.createdAt.toDate(), "dd/MM HH:mm", { locale: ptBR }) : ''}
                  </span>
                </div>
                <p className="text-gray-600 break-words text-xs leading-relaxed">{c.text}</p>
             </div>
            {isAdmin && (
              <button 
                onClick={() => handleDelete(c.id)}
                className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="relative mt-2">
        <input 
          type="text" 
          value={newComment} 
          onChange={e => setNewComment(e.target.value)} 
          placeholder="Escreva um comentário ou aviso..." 
          className="w-full pl-4 pr-12 py-3 bg-white border border-gray-200 rounded-full text-xs outline-none focus:border-indigo-500 shadow-sm transition-colors"
        />
        <button 
          type="submit" 
          disabled={!newComment.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-full transition-colors"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
