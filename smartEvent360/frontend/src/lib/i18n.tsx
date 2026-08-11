/**
 * i18n.tsx — Traduction FR / AR + RTL.
 * Français par défaut ; bascule possible en arabe (direction RTL).
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Lang = 'fr' | 'ar';

const dict = {
  // ── Navigation admin ──
  Dashboard: { fr: 'Dashboard', ar: 'لوحة القيادة' },
  Clients: { fr: 'Clients', ar: 'العملاء' },
  Devis: { fr: 'Devis', ar: 'عروض الأسعار' },
  Événements: { fr: 'Événements', ar: 'الفعاليات' },
  Réservations: { fr: 'Réservations', ar: 'الحجوزات' },
  'Packs & Offres': { fr: 'Packs & Offres', ar: 'الباقات والعروض' },
  Personnel: { fr: 'Personnel', ar: 'الموظفون' },
  Équipements: { fr: 'Équipements', ar: 'المعدات' },
  Calendrier: { fr: 'Calendrier', ar: 'التقويم' },
  Trésorerie: { fr: 'Trésorerie', ar: 'الخزينة' },
  Appels: { fr: 'Appels', ar: 'المكالمات' },
  'Rendez-vous': { fr: 'Rendez-vous', ar: 'المواعيد' },
  Paramètres: { fr: 'Paramètres', ar: 'الإعدادات' },
  Raccourcis: { fr: 'Raccourcis', ar: 'اختصارات' },
  'Nouveau client': { fr: 'Nouveau client', ar: 'عميل جديد' },
  'Nouveau devis': { fr: 'Nouveau devis', ar: 'عرض سعر جديد' },
  'Nouvel événement': { fr: 'Nouvel événement', ar: 'فعالية جديدة' },
  Nouveau: { fr: 'Nouveau', ar: 'جديد' },
  Rechercher: { fr: 'Rechercher...', ar: 'بحث...' },
  Administration: { fr: 'Administration ERP', ar: 'إدارة ERP' },

  // ── Commun ──
  Enregistrer: { fr: 'Enregistrer', ar: 'حفظ' },
  Annuler: { fr: 'Annuler', ar: 'إلغاء' },
  Supprimer: { fr: 'Supprimer', ar: 'حذف' },
  Modifier: { fr: 'Modifier', ar: 'تعديل' },
  Ajouter: { fr: 'Ajouter', ar: 'إضافة' },
  'Sauvegarde...': { fr: 'Sauvegarde...', ar: 'جارٍ الحفظ...' },
  Erreur: { fr: 'Erreur', ar: 'خطأ' },

  // ── Personnel ──
  'Gestion du Personnel': { fr: 'Gestion du Personnel', ar: 'إدارة الموظفين' },
  employés: { fr: 'employés', ar: 'موظفين' },
  'Nouvel employé': { fr: 'Nouvel employé', ar: 'موظف جديد' },
  "Modifier l'employé": { fr: "Modifier l'employé", ar: 'تعديل الموظف' },
  'Supprimer cet employé ?': { fr: 'Supprimer cet employé ?', ar: 'حذف هذا الموظف؟' },
  Nom: { fr: 'Nom', ar: 'الاسم' },
  Prénom: { fr: 'Prénom', ar: 'اللقب' },
  Email: { fr: 'Email', ar: 'البريد الإلكتروني' },
  Téléphone: { fr: 'Téléphone', ar: 'الهاتف' },
  Fonction: { fr: 'Fonction', ar: 'الوظيفة' },
  Disponibilité: { fr: 'Disponibilité', ar: 'التوفر' },
  Salaire: { fr: 'Salaire', ar: 'الراتب' },
  Notes: { fr: 'Notes', ar: 'ملاحظات' },
  Type: { fr: 'Type', ar: 'النوع' },
  Interne: { fr: 'Interne', ar: 'داخلي' },
  Externe: { fr: 'Externe', ar: 'خارجي' },
  Adresse: { fr: 'Adresse', ar: 'العنوان' },
  'Code postal': { fr: 'Code postal', ar: 'الرمز البريدي' },
  '2e email': { fr: '2e email', ar: 'البريد الإلكتروني الثاني' },

  // ── Équipements ──
  'Gestion des Équipements': { fr: 'Gestion des Équipements', ar: 'إدارة المعدات' },
  équipements: { fr: 'équipements', ar: 'معدات' },
  'Nouvel équipement': { fr: 'Nouvel équipement', ar: 'معدات جديدة' },
  "Modifier l'équipement": { fr: "Modifier l'équipement", ar: 'تعديل المعدات' },
  'Supprimer cet équipement ?': { fr: 'Supprimer cet équipement ?', ar: 'حذف هذه المعدات؟' },
  Catégorie: { fr: 'Catégorie', ar: 'الفئة' },
  Référence: { fr: 'Référence', ar: 'المرجع' },
  État: { fr: 'État', ar: 'الحالة' },
  Localisation: { fr: 'Localisation', ar: 'الموقع' },
  'Prix location (DT/j)': { fr: 'Prix location (DT/j)', ar: 'سعر الإيجار (د.ت/يوم)' },
  'Prix achat (DT)': { fr: 'Prix achat (DT)', ar: 'سعر الشراء (د.ت)' },
  Description: { fr: 'Description', ar: 'الوصف' },
  'nuits pour être rentabilisé': { fr: 'nuits pour être rentabilisé', ar: 'ليالٍ لتحقيق الربحية' },

  // ── Appels ──
  'Gestion des Appels': { fr: 'Gestion des Appels', ar: 'إدارة المكالمات' },
  appels: { fr: 'appels', ar: 'مكالمات' },
  'Nouvel appel': { fr: 'Nouvel appel', ar: 'مكالمة جديدة' },
  Objet: { fr: 'Objet', ar: 'الموضوع' },
  Statut: { fr: 'Statut', ar: 'الحالة' },
  'Date & Heure': { fr: 'Date & Heure', ar: 'التاريخ والوقت' },
  'Durée (min)': { fr: 'Durée (min)', ar: 'المدة (دقيقة)' },
  'Enregistrement vocal': { fr: 'Enregistrement vocal', ar: 'تسجيل صوتي' },
  Démarrer: { fr: 'Démarrer', ar: 'بدء' },
  Arrêter: { fr: 'Arrêter', ar: 'إيقاف' },
  Réenregistrer: { fr: 'Réenregistrer', ar: 'إعادة التسجيل' },

  // ── Navigation client ──
  'Tableau de bord': { fr: 'Tableau de bord', ar: 'لوحة القيادة' },
  'Mes Packs': { fr: 'Mes Packs', ar: 'باقاتي' },
  'Mes Devis': { fr: 'Mes Devis', ar: 'عروض أسعاري' },
  'Mes Contrats': { fr: 'Mes Contrats', ar: 'عقودي' },
  'Mes Paiements': { fr: 'Mes Paiements', ar: 'مدفوعاتي' },
  'Mes Rendez-vous': { fr: 'Mes Rendez-vous', ar: 'مواعيدي' },
  'Mon Profil': { fr: 'Mon Profil', ar: 'ملفي الشخصي' },
  Support: { fr: 'Support', ar: 'الدعم' },
  Déconnexion: { fr: 'Déconnexion', ar: 'تسجيل الخروج' },
  'Espace Client': { fr: 'Espace Client', ar: 'مساحة العميل' },

  // ── Packs / réservation ──
  'Ajouter un pack': { fr: 'Ajouter un pack', ar: 'إضافة باقة' },
  "Vous n'avez encore aucun pack.": { fr: "Vous n'avez encore aucun pack.", ar: 'لا تملك أي باقة بعد.' },
  'Découvrir nos packs': { fr: 'Découvrir nos packs', ar: 'اكتشف باقاتنا' },
  Réservé: { fr: 'Réservé', ar: 'محجوز' },
  Annulé: { fr: 'Annulé', ar: 'ملغي' },
  Quantité: { fr: 'Quantité', ar: 'الكمية' },
  Durée: { fr: 'Durée', ar: 'المدة' },
  Invités: { fr: 'Invitès', ar: 'الضيوف' },
  Date: { fr: 'Date', ar: 'التاريخ' },
  Prix: { fr: 'Prix', ar: 'السعر' },
  'Nos Packs Événementiels': { fr: 'Nos Packs Événementiels', ar: 'باقات الفعاليات' },
  'Choisir ce pack': { fr: 'Choisir ce pack', ar: 'اختر هذه الباقة' },
  'Réserver ce pack': { fr: 'Réserver ce pack', ar: 'احجز هذه الباقة' },
  'Devis personnalisé': { fr: 'Devis personnalisé', ar: 'عرض سعر مخصص' },
  'Vérifier la disponibilité': { fr: 'Vérifier la disponibilité', ar: 'التحقق من التوفر' },
  "Ce pack n'est pas disponible pour cette date.": { fr: "Ce pack n'est pas disponible pour cette date.", ar: 'هذه الباقة غير متوفرة في هذا التاريخ.' },
  'Ce pack est disponible pour cette date.': { fr: 'Ce pack est disponible pour cette date.', ar: 'هذه الباقة متوفرة في هذا التاريخ.' },
  Disponible: { fr: 'Disponible', ar: 'متوفرة' },
  'Confirmer la réservation': { fr: 'Confirmer la réservation', ar: 'تأكيد الحجز' },
  Récapitulatif: { fr: 'Récapitulatif', ar: 'ملخص' },
  'Réservation confirmée': { fr: 'Réservation confirmée', ar: 'تم تأكيد الحجز' },
  'Voir mes packs': { fr: 'Voir mes packs', ar: 'عرض باقاتي' },
  'Connectez-vous pour continuer': { fr: 'Connectez-vous pour continuer', ar: 'سجّل الدخول للمتابعة' },
  'Se connecter': { fr: 'Se connecter', ar: 'تسجيل الدخول' },
  'Créer un compte': { fr: 'Créer un compte', ar: 'إنشاء حساب' },
  'Aucun pack disponible pour le moment.': { fr: 'Aucun pack disponible pour le moment.', ar: 'لا تتوفر أي باقة حاليًا.' },
  'Prix du pack': { fr: 'Prix du pack', ar: 'سعر الباقة' },
  heures: { fr: 'heures', ar: 'ساعات' },
  "Jusqu'à": { fr: "Jusqu'à", ar: 'حتى' },
  invités: { fr: 'invités', ar: 'ضيفًا' },
  'Le pack comprend': { fr: 'Le pack comprend', ar: 'تتضمن الباقة' },
  'Inclus dans ce pack': { fr: 'Inclus dans ce pack', ar: 'مشمول في هذه الباقة' },
  'prestations supplémentaires': { fr: 'prestations supplémentaires', ar: 'مزايا إضافية' },
  'Image du pack': { fr: 'Image du pack', ar: 'صورة الباقة' },
  "Date de l'événement": { fr: "Date de l'événement", ar: 'تاريخ الفعالية' },
  Message: { fr: 'Message', ar: 'الرسالة' },
  Loading: { fr: 'Chargement...', ar: 'جارٍ التحميل...' },
  Retour: { fr: 'Retour', ar: 'رجوع' },
  Suivant: { fr: 'Suivant', ar: 'التالي' },
  Précédent: { fr: 'Précédent', ar: 'السابق' },
  Confirmation: { fr: 'Confirmation', ar: 'التأكيد' },
  Informations: { fr: 'Informations', ar: 'المعلومات' },
  Besoins: { fr: 'Besoins', ar: 'الاحتياجات' },
  'Besoins techniques': { fr: 'Besoins techniques', ar: 'الاحتياجات التقنية' },
  'Vos informations': { fr: 'Vos informations', ar: 'معلوماتك' },
  'Votre événement': { fr: 'Votre événement', ar: 'فعاليتك' },
  'Informations complémentaires': { fr: 'Informations complémentaires', ar: 'معلومات إضافية' },
  Événement: { fr: 'Événement', ar: 'الفعالية' },
  'Demande envoyée': { fr: 'Demande envoyée', ar: 'تم إرسال الطلب' },
  'Demande envoyée !': { fr: 'Demande envoyée !', ar: 'تم إرسال الطلب!' },
  'Demander un devis': { fr: 'Demander un devis', ar: 'اطلب عرض سعر' },
  'Demande de devis': { fr: 'Demande de devis', ar: 'طلب عرض سعر' },
  'Demander un devis gratuit': { fr: 'Demander un devis gratuit', ar: 'اطلب عرض سعر مجاني' },
  'Budget estimé': { fr: 'Budget estimé', ar: 'الميزانية التقديرية' },
  "Nombre d'invités": { fr: "Nombre d'invités", ar: 'عدد الضيوف' },
  Ville: { fr: 'Ville', ar: 'المدينة' },
  Salle: { fr: 'Salle', ar: 'القاعة' },
  "Type d'événement": { fr: "Type d'événement", ar: 'نوع الفعالية' },
  Société: { fr: 'Société', ar: 'الشركة' },
  Civilité: { fr: 'Civilité', ar: 'اللقب' },
  Services: { fr: 'Services', ar: 'الخدمات' },
  'Envoyer la demande': { fr: 'Envoyer la demande', ar: 'إرسال الطلب' },
  Envoi: { fr: 'Envoi...', ar: 'جارٍ الإرسال...' },
  Merci: { fr: 'Merci', ar: 'شكرًا' },
  'Solutions Clés en Main': { fr: 'Solutions Clés en Main', ar: 'حلول متكاملة' },
  'Des formules adaptées à tous vos événements et tous vos budgets': { fr: 'Des formules adaptées à tous vos événements et tous vos budgets', ar: 'صيغ تناسب جميع فعالياتكم وميزانياتكم' },
  'Services inclus': { fr: 'Services inclus', ar: 'الخدمات المضمنة' },
  'Invités max': { fr: 'Invitès max', ar: 'الحد الأقصى للضيوف' },
  'Vous souhaitez un pack sur mesure ?': { fr: 'Vous souhaitez un pack sur mesure ?', ar: 'هل تريدون باقة مخصصة؟' },
  'Nos experts vous accompagnent pour créer offre adaptée': { fr: 'Nos experts vous accompagnent pour créer l\'offre parfaitement adaptée à votre événement et votre budget.', ar: 'خبراؤنا يرافقونكم لإنشاء عرض مخصص لفعاليتكم وميزانيتكم.' },
  'Contactez un conseiller': { fr: 'Contactez un conseiller', ar: 'تواصل مع مستشار' },
  'Fermer': { fr: 'Fermer', ar: 'إغلاق' },
  'La date doit être future': { fr: 'Veuillez choisir une date à venir.', ar: 'الرجاء اختيار تاريخ قادم.' },
  'Pack indisponible': { fr: 'Pack introuvable ou inactif.', ar: 'الباقة غير موجودة أو غير نشطة.' },
  'Réservation confirmée !': { fr: 'Réservation confirmée !', ar: 'تم تأكيد الحجز!' },
  'Votre pack a été ajouté à vos packs.': { fr: 'Votre pack a été ajouté à « Mes packs ».', ar: 'تمت إضافة باقتك إلى « باقاتي ».' },
  'Annuler la réservation': { fr: 'Annuler la réservation', ar: 'إلغاء الحجز' },
  'Réservation annulée': { fr: 'Réservation annulée', ar: 'تم إلغاء الحجز' },
  'Choisir une autre date': { fr: 'Choisir une autre date', ar: 'اختر تاريخًا آخر' },
  'Sélectionnez votre date': { fr: 'Sélectionnez la date de votre événement', ar: 'اختر تاريخ فعاليتك' },
  'Notes (optionnel)': { fr: 'Notes (optionnel)', ar: 'ملاحظات (اختياري)' },
  'Prochain pack': { fr: 'Prochain pack', ar: 'الباقة القادمة' },
  'Mon prochain pack': { fr: 'Mon prochain pack', ar: 'باقتي القادمة' },
  'Voir tous mes packs': { fr: 'Voir tous mes packs', ar: 'عرض كل باقاتي' },
  'La vérification de disponibilité nécessite un compte.': { fr: 'La vérification de disponibilité nécessite un compte.', ar: 'التحقق من التوفر يتطلب تسجيل الدخول.' },
  Continuer: { fr: 'Continuer', ar: 'متابعة' },
  Pack: { fr: 'Pack', ar: 'الباقة' },
} as const;

export type TranslationKey = keyof typeof dict;

const DEFAULT_LANG: Lang = 'fr';
const STORAGE_KEY = 'se360-lang';

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  rtl: boolean;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'ar' ? 'ar' : DEFAULT_LANG;
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: TranslationKey) => dict[key]?.[lang] ?? dict[key]?.fr ?? key;
  const rtl = lang === 'ar';

  return (
    <I18nContext.Provider value={{ lang, setLang, t, rtl, dir: rtl ? 'rtl' : 'ltr' }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
