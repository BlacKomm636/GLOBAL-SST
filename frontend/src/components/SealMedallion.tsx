const TICK_COUNT = 48;

type Props = {
  status: 'ACTIVE' | 'REVOKED';
};

/**
 * Medallon grabado tipo sello notarial: anillo de trazos radiales (guilloche)
 * + marca central. Es el elemento firma de la pagina publica de verificacion.
 */
export default function SealMedallion({ status }: Props) {
  const accent = status === 'ACTIVE' ? 'var(--seal-green)' : 'var(--revoked)';
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const angle = (i / TICK_COUNT) * 360;
    const long = i % 4 === 0;
    return { angle, r1: long ? 70 : 74, r2: 82 };
  });

  return (
    <svg viewBox="0 0 200 200" width="132" height="132" role="img" aria-label={status === 'ACTIVE' ? 'Sello: certificado valido' : 'Sello: certificado revocado'}>
      <circle cx="100" cy="100" r="94" fill="none" stroke="var(--seal-gold)" strokeWidth="1" opacity="0.55" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="var(--seal-gold)" strokeWidth="1" opacity="0.35" />
      {ticks.map((t, i) => {
        const rad = (t.angle * Math.PI) / 180;
        const x1 = 100 + t.r1 * Math.cos(rad);
        const y1 = 100 + t.r1 * Math.sin(rad);
        const x2 = 100 + t.r2 * Math.cos(rad);
        const y2 = 100 + t.r2 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--seal-gold)" strokeWidth="1" opacity="0.6" />;
      })}
      <circle cx="100" cy="100" r="62" fill="none" stroke={accent} strokeWidth="1.5" />
      <circle cx="100" cy="100" r="54" fill="none" stroke={accent} strokeWidth="1" opacity="0.5" />
      {status === 'ACTIVE' ? (
        <path d="M72 101 L92 121 L130 79" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M80 80 L120 120 M120 80 L80 120" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
      )}
    </svg>
  );
}
