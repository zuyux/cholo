import Link from 'next/link';

export const Navbar = () => {
  return (
    <nav className="cholo-nav">
      <div className="cholo-nav-inner">
        <Link href="/" className="cholo-nav-brand"><span>$CHOLO<br /></span></Link>
        <div className="cholo-nav-links">
          <Link href="/#files">Historia</Link>
          <Link href="/#tokenomics">Tokenomics</Link>
          <Link href="/#gallery">Archivo</Link>
          <Link href="/wallet">Billetera</Link>
        </div>
      </div>
    </nav>
  )
}
