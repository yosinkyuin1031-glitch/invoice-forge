"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { updatePassword } from "@/lib/storage";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Wait for Supabase to process recovery token from URL hash
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Also mark ready if session already exists
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }
    if (password !== confirm) {
      setError("パスワードが一致しません");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setMessage("パスワードを更新しました。ログイン画面からログインしてください。");
      setTimeout(() => { window.location.href = "/"; }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">InvoiceForge</h1>
          <p className="text-sm text-gray-500 mt-1">新しいパスワード設定</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-800 text-center">パスワード再設定</h2>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          {message && <p className="text-sm text-green-600 bg-green-50 rounded-lg p-3">{message}</p>}
          {!ready && !message && (
            <p className="text-xs text-gray-500 bg-yellow-50 rounded-lg p-3">
              メールのリンクから来ていない場合は、ログイン画面の「パスワードを忘れた方はこちら」からやり直してください。
            </p>
          )}
          <div>
            <label htmlFor="new-password" className="text-xs text-gray-500">新しいパスワード</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              placeholder="6文字以上"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="text-xs text-gray-500">新しいパスワード（確認）</label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              placeholder="もう一度入力"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "処理中..." : "パスワードを更新"}
          </button>
          <p className="text-center text-xs text-gray-500">
            <a href="/" className="text-blue-600 hover:underline">ログイン画面に戻る</a>
          </p>
        </form>
      </div>
    </div>
  );
}
