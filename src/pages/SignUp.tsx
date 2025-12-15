import { Link } from 'react-router-dom';

export default function SignUp() {
    return (
        <div className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center">
            {/* Background gradient effect - using brand teal */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0e7288]/40 via-[#0a5a6c]/50 to-black" />

            <div className="w-full max-w-md relative z-10">
                <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-white/[0.05] shadow-2xl">
                    <div className="text-center space-y-4 mb-6">
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                            Create Account
                        </h1>
                        <p className="text-white/60 text-sm">
                            Sign up is currently by invitation only. Please contact your administrator.
                        </p>
                    </div>

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
