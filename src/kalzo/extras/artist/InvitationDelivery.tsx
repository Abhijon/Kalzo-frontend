import { useState, type ReactNode } from "react";
import { MailOpen, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import top from "@/assets/invitation-flourish-top.png.asset.json";
import bottom from "@/assets/invitation-flourish-bottom.png.asset.json";
export function InvitationDelivery({
  children,
  empty = false,
}: {
  children: ReactNode;
  empty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (empty) return <div className="ki-empty-delivery">
    <div className="ki-living-envelope" aria-hidden="true"><div className="ki-living-letter">❦ KALZO ❦</div><div className="ki-living-pocket" /><div className="ki-living-flap" /><span className="ki-living-seal">K</span></div>
    <div className="ki-empty-copy">{children}</div>
  </div>;
  return (
    <div className={`ki-delivery ${open ? "ki-open" : ""}`}>
      {!open && (
        <Button
          variant="outline"
          className="ki-envelope"
          onClick={() => setOpen(true)}
          aria-label="Open booking invitation"
        >
          <span className="ki-envelope-flap" aria-hidden="true" />
          <span className="ki-envelope-flourish" aria-hidden="true">❦</span>
          <Mail size={32} />
          <span>A mehfil awaits you</span>
          <strong>Open your invitation</strong>
          <span className="ki-seal" aria-hidden="true">❦</span>
        </Button>
      )}
      {open && (
        <div className={`ki-letter ${empty ? "ki-letter-empty" : ""}`}>
          <img className="ki-flourish ki-flourish-top" src={top.url} alt="" width={535} height={143} loading="lazy" />
          {!empty && <p className="ki-invitation-heading">You are cordially invited</p>}
          <div className="ki-letter-content">{children}</div>
          <img className="ki-flourish ki-flourish-bottom" src={bottom.url} alt="" width={535} height={153} loading="lazy" />
          {!empty && (
            <Button variant="ghost" className="ki-fold" onClick={() => setOpen(false)}>
              <MailOpen size={16} />
              Fold invitation
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
