import Link from 'next/link';

type Params = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function VerifiedPage({ searchParams }: Params) {
  const error = (searchParams?.error as string) || '';
  const errorCode = (searchParams?.error_code as string) || '';
  const ok = !error && !errorCode;

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        {ok ? (
          <>
            <h1 className="text-2xl font-bold mb-2">Email verified 🎉</h1>
            <p className="text-gray-600 mb-6">
              Your account is confirmed. You can now log in with the email and password you used to sign up.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                Go to Login
              </Link>
              
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Verification link problem</h1>
            <p className="text-gray-600 mb-4">
              {errorCode === 'otp_expired'
                ? 'This link has expired. Please request a new verification email.'
                : 'This verification link is invalid or has already been used.'}
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                Go to Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-md border px-4 py-2 hover:bg-gray-50"
              >
                Start over
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Error: {errorCode || error}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
