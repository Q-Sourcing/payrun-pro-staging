import { SignInCard } from '@/components/ui/sign-in-card-2';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
    return (
        <div className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center">
            {/* Background gradient effect - using brand teal */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0e7288]/40 via-[#0a5a6c]/50 to-black" />

            <div className="w-full max-w-md relative z-10">
                <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-white/[0.05] shadow-2xl">
                    <div className="text-center space-y-4 mb-6">
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                            Reset Password
                        </h1>
                        <p className="text-white/60 text-sm">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                    </div>

                    <form className="space-y-4">
                        <div>
                            <input
                                type="email"
                                placeholder="Email address"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-white/90 transition-all"
                        >
                            Send Reset Link
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="text-sm text-white/60 hover:text-white transition-colors"
                        >
                            ← Back to login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
