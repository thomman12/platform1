import VerifiedClient from './VerifiedClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VerifiedPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const sp = (await searchParams) ?? {};
  const get = (k: string) =>
    typeof sp[k] === 'string' ? (sp[k] as string) : '';

  const error = get('error');
  const errorCode = get('error_code');
  const st = get('st'); // student flow token (optional)
  const next = get('next') || '/signup/avatar';

  return <VerifiedClient error={error} errorCode={errorCode} st={st} next={next} />;
}
