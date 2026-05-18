"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";
import type { User } from "@supabase/supabase-js";

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/admin" },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">로딩 중...</p>
      </div>
    );
  }

  // 분기 1: 비로그인
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-black text-white">관리자 로그인</h1>
          <button
            onClick={handleGoogleLogin}
            className="flex items-center gap-3 px-6 py-3 bg-white text-zinc-800 font-bold rounded-xl hover:bg-zinc-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Google로 로그인
          </button>
        </div>
      </div>
    );
  }

  // 분기 2: 로그인했지만 권한 없음
  if (!isAdmin(user.email)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-black text-white">접근 권한이 없습니다</h1>
          <p className="text-zinc-400 text-sm">이 페이지는 관리자만 접근할 수 있어요</p>
          <p className="text-zinc-500 text-xs">로그인된 계정: {user.email}</p>
          <button
            onClick={handleLogout}
            className="px-5 py-2 bg-zinc-800 text-white text-sm font-semibold rounded-lg hover:bg-zinc-700 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  // 분기 3: 권한 있음 — 어드민 콘텐츠
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 h-14 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <span className="text-sm font-black tracking-tight text-indigo-400 uppercase">
          관리자: {user.email}
        </span>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
        >
          로그아웃
        </button>
      </header>

      {/* 어드민 콘텐츠 */}
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-black tracking-tight">어드민 대시보드</h1>
        <p className="text-zinc-400 text-sm">관리자 전용 콘텐츠를 여기에 추가하세요.</p>
      </main>
    </div>
  );
}
