import { useEffect, useState } from 'react';
import { authApi, NeonUser } from '@/lib/neonApi';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientRecord {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string;
  civilite: string | null;
  telephone: string | null;
  email_secondaire: string | null;
  telephone_secondaire: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string | null;
  societe: string | null;
  siret: string | null;
  statut: string;
  notes: string | null;
  date_creation: string;
}

// Fallback utilisé uniquement si l'API /auth/me échoue (démo hors-ligne)
function makeMockClient(userId: string, email: string): ClientRecord {
  return {
    id: `mock-client-${userId}`,
    nom: 'Démo',
    prenom: 'Client',
    email: email || 'client@demo.fr',
    civilite: 'M.',
    telephone: '06 00 00 00 00',
    email_secondaire: null,
    telephone_secondaire: null,
    adresse: '12 Rue de la Démo',
    code_postal: '75001',
    ville: 'Paris',
    pays: 'France',
    societe: null,
    siret: null,
    statut: 'actif',
    notes: 'Compte de démonstration',
    date_creation: new Date().toISOString(),
  };
}

function mapUserToClient(u: NeonUser): ClientRecord {
  return {
    id: u.id,
    nom: u.nom,
    prenom: u.prenom,
    email: u.email,
    civilite: null,
    telephone: u.phone,
    email_secondaire: u.email2,
    telephone_secondaire: u.phone2,
    adresse: u.address,
    code_postal: u.postalCode,
    ville: u.city,
    pays: null,
    societe: u.company,
    siret: u.matfisc,
    statut: 'actif',
    notes: u.notes,
    date_creation: u.createdAt,
  };
}

export function useClientRecord() {
  const { user } = useAuth();
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setClient(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    authApi
      .me()
      .then(u => {
        if (!cancelled) setClient(mapUserToClient(u));
      })
      .catch(() => {
        if (!cancelled) setClient(makeMockClient(user.id, user.email));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user]);

  return { client, clientId: client?.id ?? null, loading, setClient };
}
