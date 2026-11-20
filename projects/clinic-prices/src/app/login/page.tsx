export default async function Login({ searchParams }: PageProps<"/login">) {
  const { e } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="card space-y-4">
        <div>
          <h1 className="text-lg font-bold">시술가 시세</h1>
          <p className="mute text-sm">병원 내부 참고용입니다. 비밀번호를 넣어 주세요.</p>
        </div>
        <form method="post" action="/api/login" className="space-y-3">
          <input className="input" type="password" name="password" autoComplete="current-password" placeholder="비밀번호" required autoFocus />
          {e && <div className="text-sm text-[var(--bad)]">비밀번호가 맞지 않습니다</div>}
          <button className="btn btn-primary w-full justify-center" type="submit">들어가기</button>
        </form>
      </div>
    </main>
  );
}
