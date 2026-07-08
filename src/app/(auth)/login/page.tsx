
"use client";

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import {
  Button
} from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { auth } from '@/lib/firebase-config';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLanguage } from '@/contexts/language-provider';
import Image from 'next/image';

const signUpSchema = z.object({
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine(val => val === true, {
        message: "You must accept the terms and conditions.",
    }),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(1, { message: "Password is required." }),
});

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
        <defs>
            <linearGradient id="fire" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#FF4848'}} />
                <stop offset="100%" style={{stopColor: '#FACC15'}} />
            </linearGradient>
            <linearGradient id="water" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#22D3EE'}} />
                <stop offset="100%" style={{stopColor: '#3B82F6'}} />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#fire)" />
        <path d="M12 2a10 10 0 0 0 0 20c3.5 0 6.6-1.8 8.4-4.5a.5.5 0 0 1 .1-.5 8 8 0 0 0-15-5 .5.5 0 0 1 .2-1A10 10 0 0 1 12 2Z" fill="url(#water)" />
        <path d="M5.9 12.5a.5.5 0 0 0-.2 1 8 8 0 0 1 15 5 .5.5 0 0 0-.1.5A10 10 0 0 1 4 12c0-.8.1-1.6.4-2.3a.5.5 0 0 0-.3-.9ZM18.1 11.5a.5.5 0 0 0 .2-1 8 8 0 0 1-15-5A.5.5 0 0 0 3.4 6 10 10 0 0 1 20 12c0 .8-.1-1.6-.4 2.3a.5.5 0 0 0 .3.9Z" stroke="hsl(var(--background))" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
);

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.06,4.72C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.28-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,35.536,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);


export default function LoginPage() {
    const { t, isMounted, language, setLanguage } = useLanguage();
    const [activeTab, setActiveTab] = useState("login");
    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const { toast } = useToast();
    const router = useRouter();

    const loginForm = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const signUpForm = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { email: "", password: "", confirmPassword: "", acceptTerms: false },
    });

    const handleLogin = (values: z.infer<typeof loginSchema>) => {
        startTransition(async () => {
            try {
                await signInWithEmailAndPassword(auth, values.email, values.password);
                toast({ title: t('loginSuccessTitle'), description: t('loginSuccessDesc') });
                router.push('/');
            } catch (error: any) {
                toast({ variant: "destructive", title: t('loginFailedTitle'), description: t('loginFailedDesc') });
            }
        });
    };

    const handleSignUp = (values: z.infer<typeof signUpSchema>) => {
        startTransition(async () => {
            try {
                const { email, password } = values;
                await createUserWithEmailAndPassword(auth, email, password);
                toast({ title: t('signupSuccessTitle'), description: t('signupSuccessDesc') });
                setActiveTab("login");
            } catch (error: any) {
                 if (error.code === 'auth/email-already-in-use') {
                    toast({ variant: "destructive", title: t('signupFailedTitle'), description: t('signupFailedEmailInUse') });
                } else {
                    toast({ variant: "destructive", title: t('signupFailedTitle'), description: t('signupFailedDesc') });
                }
            }
        });
    };
    
    const handleGoogleSignIn = () => {
        startTransition(async () => {
            try {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                toast({ title: t('googleSuccessTitle'), description: t('googleSuccessDesc') });
                router.push('/');
            } catch (error: any) {
                if (error.code === 'auth/operation-not-allowed') {
                    toast({ variant: "destructive", title: t('googleFailedTitle'), description: "Google Sign-In is not enabled. Please enable it in your Firebase console." });
                } else {
                    toast({ variant: "destructive", title: t('googleFailedTitle'), description: t('googleFailedDesc') });
                }
            }
        });
    }

    const handlePasswordReset = () => {
        if (!resetEmail) {
            toast({ variant: "destructive", title: t('resetPwdErrorTitle'), description: t('resetPwdErrorDesc') });
            return;
        }
        startTransition(async () => {
            try {
                await sendPasswordResetEmail(auth, resetEmail);
                toast({ title: t('resetPwdSuccessTitle'), description: t('resetPwdSuccessDesc') });
            } catch (error) {
                 toast({ variant: "destructive", title: t('resetPwdErrorTitle'), description: t('resetPwdFailedDesc') });
            }
        });
    }
    
    const isSubmitting = loginForm.formState.isSubmitting || signUpForm.formState.isSubmitting || isPending;

    if (!isMounted) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-background p-4">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
          <div className="flex items-center justify-center py-12">
            <div className="mx-auto grid w-[350px] gap-6">
                <div className="grid gap-2 text-center">
                    <div className="mx-auto h-16 w-16">
                        <Logo />
                    </div>
                    <h1 className="text-3xl font-bold font-body">
                         <span className="bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent">
                            {t('appName')}
                        </span>
                    </h1>
                    <p className="text-balance text-muted-foreground">
                       {t('appSlogan')}
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">{t('login')}</TabsTrigger>
                            <TabsTrigger value="signup">{t('signUp')}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="login" className="mt-6">
                             <Form {...loginForm}>
                                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                                    <FormField
                                        control={loginForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('email')}</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="you@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={loginForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('password')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showPassword ? "text" : "password"} {...field} />
                                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground">
                                                            {showPassword ? <EyeOff /> : <Eye />}
                                                        </button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                 <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                        <Button variant="link" type="button" className="p-0 h-auto font-normal text-muted-foreground">{t('forgotPassword')}</Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                         <AlertDialogHeader>
                                             <AlertDialogTitle>{t('resetPassword')}</AlertDialogTitle>
                                             <AlertDialogDescription>
                                                {t('resetPasswordDesc')}
                                             </AlertDialogDescription>
                                         </AlertDialogHeader>
                                         <Input 
                                            type="email" 
                                            placeholder="you@example.com"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                          />
                                         <AlertDialogFooter>
                                             <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                             <AlertDialogAction onClick={handlePasswordReset}>{t('sendResetLink')}</AlertDialogAction>
                                         </AlertDialogFooter>
                                     </AlertDialogContent>
                                 </AlertDialog>
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                                    {t('login')}
                                </Button>
                                </form>
                            </Form>
                        </TabsContent>
                        <TabsContent value="signup" className="mt-6">
                            <Form {...signUpForm}>
                                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                                    <FormField
                                        control={signUpForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('email')}</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="you@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={signUpForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('password')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showPassword ? "text" : "password"} {...field} />
                                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground">
                                                            {showPassword ? <EyeOff /> : <Eye />}
                                                        </button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={signUpForm.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('confirmPassword')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showConfirmPassword ? "text" : "password"} {...field} />
                                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground">
                                                            {showConfirmPassword ? <EyeOff /> : <Eye />}
                                                        </button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={signUpForm.control}
                                        name="acceptTerms"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        {t('accept')} <Link href="#" className="underline">{t('terms')}</Link>.
                                                    </FormLabel>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t('termsDisclaimer')}
                                                    </p>
                                                     <FormMessage />
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                                        {t('signUp')}
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
                </Tabs>

                <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">{t('orContinueWith')}</span>
                    </div>
                </div>
                 <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
                     {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <GoogleIcon className="mr-2" />}
                    Google
                </Button>
                 <div className="absolute top-4 right-4">
                    <Button variant="ghost" size="icon" onClick={() => {
                        setLanguage(language === 'en' ? 'ar' : 'en');
                    }}>
                        <Languages />
                    </Button>
                </div>
            </div>
          </div>
          <div className="hidden bg-muted lg:block relative">
            <Image
              src="https://picsum.photos/seed/login/1200/1800"
              alt="Image"
              fill
              className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
              data-ai-hint="abstract art"
            />
          </div>
        </div>
    );
}
