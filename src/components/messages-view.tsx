"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, AlertTriangle, Trash2, Paperclip, Camera, Loader2, PlayCircle, Image as ImageIcon, Video, X, Sparkles, Phone, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import CameraView from '@/components/camera-view';
import AppCall, { CallTarget } from './app-call';
import SendMoneyDialog from '@/components/send-money-dialog';

const mockConversations = [
  {
    id: 1,
    name: 'Khalid',
    avatar: 'https://picsum.photos/id/1005/40/40',
    timestamp: '5m ago',
    unread: 2,
    messages: [
      { id: 1, type: 'text', content: 'Hey, are you free to meet tomorrow?', sender: 'Khalid', timestamp: '10m ago' },
      { id: 2, type: 'text', content: 'Yeah, I should be. What time works for you?', sender: 'You', timestamp: '8m ago' },
      { id: 3, type: 'text', content: 'How about 2 PM at the usual spot?', sender: 'Khalid', timestamp: '7m ago' },
      { id: 4, type: 'text', content: 'Sounds good! See you then.', sender: 'You', timestamp: '5m ago' },
      { id: 5, type: 'text', content: 'Did you see my vibe about the souk?', sender: 'Khalid', timestamp: '4m ago' },
      { id: 6, type: 'image', content: 'https://picsum.photos/seed/souk/400/300', sender: 'Khalid', timestamp: '3m ago' },
    ],
  },
  {
    id: 2,
    name: 'Aisha',
    avatar: 'https://picsum.photos/id/1027/40/40',
    timestamp: '1h ago',
    unread: 0,
    messages: [
        { id: 1, type: 'text', content: 'The coffee was great, we should go again.', sender: 'Aisha', timestamp: '1h ago'}
    ]
  },
  {
    id: 3,
    name: 'Fatima',
    avatar: 'https://picsum.photos/id/1011/40/40',
    timestamp: '3h ago',
    unread: 1,
    messages: [
        { id: 1, type: 'text', content: 'Your AI video was so cool!', sender: 'You', timestamp: '3h ago'},
        { id: 2, type: 'video', content: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', sender: 'Fatima', timestamp: '3h ago'}
    ]
  },
];


const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const SponsoredMessage = () => (
    <div className="flex justify-center my-4">
        <Card className="w-full max-w-sm border-primary/20 bg-primary/10">
            <CardContent className="p-3">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <Sparkles className="w-5 h-5 text-primary"/>
                    </div>
                    <div>
                        <p className="text-xs text-primary font-semibold">SPONSORED</p>
                        <p className="text-sm font-medium">Live Music Night</p>
                        <p className="text-xs text-primary/80">Tonight at The Music Hall, 9 PM. Don't miss out!</p>
                    </div>
                    <Button size="sm" className="ml-auto text-xs h-7">Get Ticket</Button>
                </div>
            </CardContent>
        </Card>
    </div>
);


export default function MessagesView() {
    const searchParams = useSearchParams();
    const [conversations, setConversations] = useState(mockConversations);
    const [selectedConversationId, setSelectedConversationId] = useState<number | null>(conversations.find(c => c.unread > 0)?.id || mockConversations[0]?.id || null);
    const [message, setMessage] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [activeCallTarget, setActiveCallTarget] = useState<CallTarget | null>(null);
    const [isSendMoneyOpen, setIsSendMoneyOpen] = useState(false);
    const { toast } = useToast();

    const selectedConversation = conversations.find(c => c.id === selectedConversationId);

    // Deep-linked from the Vibes Map's "Message" action on a friend's live
    // location pin (see vibes-map.tsx). These conversations are mock/local
    // data rather than real per-user threads, so this is a best-effort
    // name match rather than a guaranteed conversation - if nobody in the
    // (currently fake) conversation list matches, we say so instead of
    // silently landing on the wrong chat.
    useEffect(() => {
        const to = searchParams.get('to');
        if (!to) return;
        const match = conversations.find(c => c.name.toLowerCase() === to.toLowerCase());
        if (match) {
            setSelectedConversationId(match.id);
        } else {
            toast({ title: "No conversation yet", description: `You don't have a chat with @${to} yet.` });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                setMediaType('image');
            } else if (file.type.startsWith('video/')) {
                setMediaType('video');
            } else {
                toast({ variant: 'destructive', title: "Unsupported file type" });
                return;
            }
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    }

    const handleSendMediaFromCamera = async (dataUri: string, type: 'photo' | 'video') => {
        const newMessage = {
            id: Date.now(),
            type: type === 'photo' ? 'image' : 'video',
            content: dataUri,
            sender: 'You',
            timestamp: 'Just now'
        };

        handleSendMessage(newMessage);
        setIsCameraOpen(false);
    }
    
    const handleSendMessage = (newMessage: any) => {
        if (!selectedConversation) return;

        const updatedConversations = conversations.map(convo => {
            if (convo.id === selectedConversationId) {
                const updatedConvo = {
                    ...convo,
                    messages: [...convo.messages, newMessage],
                    timestamp: 'Just now'
                };
                return updatedConvo;
            }
            return convo;
        });

        // Move the updated conversation to the top
        const updatedConvo = updatedConversations.find(c => c.id === selectedConversationId);
        const otherConvos = updatedConversations.filter(c => c.id !== selectedConversationId);
        if (updatedConvo) {
            setConversations([updatedConvo, ...otherConvos]);
        } else {
            setConversations(updatedConversations);
        }

        setMessage('');
        setMediaFile(null);
        setMediaPreview(null);
        setMediaType(null);
    };

    const submitMessage = async () => {
        let newMessage;
        if (mediaFile && mediaPreview) {
            const dataUri = await fileToDataUri(mediaFile);
            newMessage = {
                id: Date.now(),
                type: mediaType,
                content: dataUri,
                sender: 'You',
                timestamp: 'Just now'
            };
        } else if (message.trim()) {
             newMessage = {
                id: Date.now(),
                type: 'text',
                content: message,
                sender: 'You',
                timestamp: 'Just now'
            };
        } else {
            return;
        }

       handleSendMessage(newMessage);
    };
    
    const handleDeleteMessage = (messageId: number) => {
        if (!selectedConversation) return;

        const updatedConversations = conversations.map(convo => {
            if (convo.id === selectedConversationId) {
                return {
                    ...convo,
                    messages: convo.messages.filter(msg => msg.id !== messageId),
                };
            }
            return convo;
        });
        setConversations(updatedConversations);
        toast({ title: "Message Deleted" });
    }

    const MessageContent = ({ message }: { message: any }) => {
        switch(message.type) {
            case 'text':
                return <p className="text-sm">{message.content}</p>;
            case 'image':
                return <Image src={message.content} alt="Shared image" width={300} height={200} className="rounded-lg object-cover" />;
            case 'video':
                return (
                    <div className="relative w-[300px] aspect-video">
                        <video src={message.content} className="w-full h-full rounded-lg bg-black" controls />
                    </div>
                );
            default:
                return null;
        }
    }

  return (
    <div className="w-full h-full mx-auto flex flex-col">
       <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 bg-muted p-2 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p>This is an ephemeral chat. Messages older than 24 hours are automatically deleted.</p>
        </div>
       </div>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
        
        {/* Conversation List */}
        <Card className="h-full flex-col hidden md:flex">
            <ScrollArea>
                 {conversations.map(convo => (
                    <button
                        key={convo.id}
                        onClick={() => setSelectedConversationId(convo.id)}
                        className={cn(
                            "flex items-center gap-3 p-4 w-full text-left border-b last:border-b-0",
                            selectedConversationId === convo.id ? 'bg-muted' : 'hover:bg-muted/50'
                        )}
                    >
                        <Avatar>
                            <AvatarImage src={convo.avatar} alt={convo.name} />
                            <AvatarFallback>{convo.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h3 className="font-semibold">{convo.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">{convo.messages[convo.messages.length - 1].content}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-muted-foreground">{convo.timestamp}</p>
                             {convo.unread > 0 && <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center mt-1">{convo.unread}</span>}
                        </div>
                    </button>
                 ))}
            </ScrollArea>
        </Card>

        {/* Chat Window */}
        <Card className="h-full flex flex-col md:col-span-2">
            {selectedConversation ? (
                 <>
                    <div className="p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                              <AvatarImage src={selectedConversation.avatar} alt={selectedConversation.name} />
                              <AvatarFallback>{selectedConversation.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <h2 className="text-lg font-semibold">{selectedConversation.name}</h2>
                        </div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" onClick={() => setIsSendMoneyOpen(true)} title="Send Money">
                              <Wallet className="w-5 h-5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setActiveCallTarget({ name: selectedConversation.name, avatar: selectedConversation.avatar, type: 'user' })}>
                              <Phone className="w-5 h-5 text-green-500" />
                            </Button>
                        </div>
                    </div>
                    <ScrollArea className="flex-grow p-4">
                        <div className="space-y-4">
                        {selectedConversation.messages.map((msg, index) => (
                            <React.Fragment key={msg.id}>
                                <div
                                    className={cn('flex items-end gap-2 group', msg.sender === 'You' ? 'justify-end' : 'justify-start')}
                                >
                                    {msg.sender !== 'You' && (
                                        <Avatar className="w-6 h-6">
                                            <AvatarImage src={selectedConversation.avatar} />
                                            <AvatarFallback>{selectedConversation.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn(
                                        'max-w-xs md:max-w-md rounded-2xl relative',
                                         (msg.type === 'image' || msg.type === 'video') ? 'p-1' : 'p-3',
                                        msg.sender === 'You' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                                    )}>
                                        <MessageContent message={msg} />
                                    </div>
                                    {msg.sender === 'You' && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="h-4 w-4 text-muted-foreground"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                                                    <AlertDialogDescription>Are you sure you want to permanently delete this message?</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction className={cn(buttonVariants({variant: "destructive"}))} onClick={() => handleDeleteMessage(msg.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                                { (index + 1) % 4 === 0 && <SponsoredMessage /> }
                             </React.Fragment>
                        ))}
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t space-y-2">
                        {mediaPreview && (
                            <div className="relative w-24 h-24 rounded-md overflow-hidden">
                                {mediaType === 'image' && <Image src={mediaPreview} alt="Preview" fill className="object-cover"/>}
                                {mediaType === 'video' && <video src={mediaPreview} className="w-full h-full object-cover" />}
                                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => {setMediaPreview(null); setMediaFile(null);}}>
                                    <X className="h-4 w-4"/>
                                </Button>
                            </div>
                        )}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                submitMessage();
                            }}
                            className="flex items-center gap-2"
                        >
                        <Input
                            placeholder="Type a message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={!!mediaFile}
                        />
                        <input type="file" id="file-upload" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                        <Button asChild variant="ghost" size="icon">
                            <label htmlFor="file-upload"><Paperclip className="w-4 h-4" /></label>
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsCameraOpen(true)}>
                            <Camera className="w-4 h-4" />
                        </Button>
                        <Button type="submit" size="icon">
                            <Send className="w-4 h-4" />
                        </Button>
                        </form>
                    </div>
                </>
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground">
                    <MessageSquare className="w-16 h-16 mb-4"/>
                    <p>Select a conversation to start chatting.</p>
                </div>
            )}
        </Card>
      </div>
       <CameraView
            open={isCameraOpen}
            onOpenChange={setIsCameraOpen}
            onUsePhoto={(uri) => handleSendMediaFromCamera(uri, 'photo')}
            onUseVideo={(uri) => handleSendMediaFromCamera(uri, 'video')}
            title="Send Media"
        />
        <AppCall
          open={!!activeCallTarget}
          onOpenChange={(open) => !open && setActiveCallTarget(null)}
          target={activeCallTarget}
        />
        <SendMoneyDialog
          open={isSendMoneyOpen}
          onOpenChange={setIsSendMoneyOpen}
          initialQuery={selectedConversation?.name}
          onSent={(recipient, sentAmount) => {
            // These conversations are mock/local data, not real Firestore
            // threads tied to a uid - so the "receipt" of a send is a local
            // system message here rather than something the recipient's
            // client would also see. The transfer itself is real (it ran
            // through sendFunds); only this in-chat confirmation is a
            // stand-in for a real messaging backend.
            handleSendMessage({
              id: Date.now(),
              type: 'text',
              content: `💸 Sent @${recipient.handle} money via Moood Wallet.`,
              sender: 'You',
              timestamp: 'Just now',
            });
          }}
        />
    </div>
  );
}
