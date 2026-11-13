/**
 * Legal page content — Terms & Conditions of Sale and Privacy Policy.
 *
 * Bilingual: the Italian version is the legally authoritative text; the English
 * version is a courtesy translation. Content is data (not i18n keys) because
 * these are long structured documents.
 *
 * DRAFTS — not legal advice. Facts only the business knows are marked with
 * [[double brackets]] and rendered highlighted so they're easy to find and
 * fill before publishing. Have an Italian lawyer review before going live.
 *
 * Sourced against: Codice del Consumo (D.Lgs. 206/2005) incl. right of
 * withdrawal (artt. 52 ss.) and legal guarantee of conformity (artt. 128 ss.,
 * as amended by D.Lgs. 170/2021); Reg. (UE) 2016/679 (GDPR); Reg. (UE)
 * 524/2013 (ODR). Actual processors taken from the codebase: Nexi XPay
 * (payments), GLS (shipping), Postmark (email), DigitalOcean/Frankfurt
 * (hosting), Sentry (error monitoring). No analytics/marketing cookies exist.
 */

export type LegalBody = string | { list: string[] };

export interface LegalSection {
  heading: string;
  body: LegalBody[];
}

export interface LegalDoc {
  title: string;
  metaDescription: string;
  updatedLabel: string;
  updated: string;
  intro: LegalBody[];
  sections: LegalSection[];
  disclaimer?: string;
}

export interface BilingualDoc {
  it: LegalDoc;
  en: LegalDoc;
}

const UPDATED_IT = "25 luglio 2026";
const UPDATED_EN = "July 25, 2026";

// ─────────────────────────────────────────────────────────────────────────
// TERMS & CONDITIONS OF SALE
// ─────────────────────────────────────────────────────────────────────────

export const TERMS: BilingualDoc = {
  it: {
    title: "Termini e Condizioni di Vendita",
    metaDescription:
      "Condizioni generali di vendita di PriMo Nails: ordini, pagamenti, spedizioni, diritto di recesso e garanzia legale.",
    updatedLabel: "Ultimo aggiornamento",
    updated: UPDATED_IT,
    intro: [
      "Le presenti Condizioni Generali di Vendita disciplinano l'acquisto dei prodotti sul sito primonails.it (di seguito il “Sito”). Effettuando un ordine, il Cliente dichiara di aver letto e accettato integralmente le presenti condizioni.",
      "I contratti di vendita si intendono conclusi in Italia e regolati dalla legge italiana. Per i consumatori si applicano le disposizioni inderogabili del Codice del Consumo (D.Lgs. 206/2005).",
    ],
    sections: [
      {
        heading: "1. Informazioni sul venditore",
        body: [
          "I prodotti sono venduti da:",
          {
            list: [
              "Denominazione: [[Ragione sociale]] (marchio “PriMo Nails”)",
              "Forma giuridica: [[forma giuridica, es. ditta individuale / S.r.l.]]",
              "Sede legale: [[indirizzo completo della sede legale]]",
              "Magazzino / logistica: Milano (IT)",
              "Partita IVA: [[Partita IVA]] — Codice Fiscale: [[Codice Fiscale]]",
              "Iscrizione al Registro delle Imprese / REA: [[numero REA]]",
              "E-mail: primonailspro@gmail.com — PEC: [[indirizzo PEC]]",
              "Telefono: [[numero di telefono]]",
            ],
          },
        ],
      },
      {
        heading: "2. Oggetto",
        body: [
          "Le presenti condizioni hanno ad oggetto la vendita a distanza di prodotti per la cura e la ricostruzione delle unghie e relativi accessori, commercializzati tramite il Sito e destinati sia a consumatori sia a professionisti.",
        ],
      },
      {
        heading: "3. Prodotti, prezzi e disponibilità",
        body: [
          "Le caratteristiche essenziali dei prodotti sono indicate nelle rispettive schede. Le immagini hanno valore illustrativo e possono differire lievemente dal prodotto reale.",
          "Tutti i prezzi sono espressi in Euro (EUR) e si intendono finali. Operazione non soggetta a IVA ai sensi dell'art. 1, commi 54-89, della Legge n. 190/2014 (regime forfettario): il prezzo indicato è quello effettivamente dovuto e non è soggetto a rivalsa dell'IVA. Le spese di spedizione, se dovute, sono indicate separatamente prima della conferma dell'ordine.",
          "PriMo Nails si riserva il diritto di modificare i prezzi in qualsiasi momento; il prezzo applicato è quello indicato sul Sito al momento dell'invio dell'ordine.",
          "La disponibilità dei prodotti è aggiornata ma non garantita in tempo reale: in caso di indisponibilità sopravvenuta il Cliente sarà informato e avrà diritto al rimborso di quanto eventualmente già pagato.",
        ],
      },
      {
        heading: "4. Conclusione del contratto",
        body: [
          "L'ordine inviato tramite il Sito costituisce proposta contrattuale. Il contratto si intende concluso quando PriMo Nails invia al Cliente la conferma d'ordine all'indirizzo e-mail fornito.",
          "Prima dell'invio dell'ordine il Cliente può verificare e correggere eventuali errori di inserimento dei dati. Conservare la conferma d'ordine è consigliato.",
        ],
      },
      {
        heading: "5. Modalità di pagamento",
        body: [
          "I pagamenti sono gestiti tramite il gateway Nexi XPay, che consente il pagamento con carte di credito/debito e altri metodi supportati. I dati di pagamento sono trattati in modalità sicura direttamente dal fornitore del servizio; PriMo Nails non memorizza i dati completi della carta.",
          "L'addebito avviene al momento della conferma dell'ordine, salvo diversa indicazione.",
        ],
      },
      {
        heading: "6. Spedizione e consegna",
        body: [
          "Le spedizioni sono effettuate tramite il corriere GLS verso l'Italia e i Paesi dell'Unione Europea serviti, con partenza dal magazzino di Milano.",
          "I costi e i tempi di consegna stimati sono indicati durante la procedura d'ordine e possono variare in base alla destinazione. Ove previsto, si applica la spedizione gratuita al superamento della soglia d'ordine indicata sul Sito.",
          "Il rischio di perdita o danneggiamento dei beni si trasferisce al consumatore al momento della consegna materiale del bene.",
          "[[Verificare eventuali limitazioni alla spedizione di determinati prodotti, es. articoli infiammabili/UN, verso alcune destinazioni.]]",
        ],
      },
      {
        heading: "7. Diritto di recesso",
        body: [
          "Il Cliente consumatore ha diritto di recedere dal contratto, senza alcuna motivazione, entro 14 giorni dal giorno in cui riceve materialmente i beni (artt. 52 e ss. del Codice del Consumo).",
          "Per esercitare il recesso, il Cliente deve informare PriMo Nails con una dichiarazione esplicita inviata a primonailspro@gmail.com, anche utilizzando il modulo di recesso tipo di cui all'Allegato I, parte B, del Codice del Consumo.",
          "I beni devono essere restituiti senza indebito ritardo e comunque entro 14 giorni dalla comunicazione del recesso, al seguente indirizzo: [[indirizzo completo per i resi]].",
          "Salvo diversa indicazione, i costi diretti di restituzione dei beni sono a carico del Cliente.",
          "PriMo Nails rimborserà i pagamenti ricevuti (incluse le spese di consegna standard) senza indebito ritardo e comunque entro 14 giorni dalla comunicazione del recesso, potendo trattenere il rimborso fino al ricevimento dei beni o della prova della loro spedizione.",
          "Esclusioni: il diritto di recesso non si applica, tra l'altro, alla fornitura di beni sigillati che non si prestano ad essere restituiti per motivi igienici o di protezione della salute e che sono stati aperti dopo la consegna (art. 59 Codice del Consumo). [[Confermare con un legale quali categorie di prodotto (es. cosmetici/prodotti unghie aperti) rientrano in questa esclusione.]]",
        ],
      },
      {
        heading: "8. Garanzia legale di conformità",
        body: [
          "I prodotti sono coperti dalla garanzia legale di conformità prevista per i consumatori dagli artt. 128 e ss. del Codice del Consumo, di durata di 24 mesi dalla consegna.",
          "In caso di difetto di conformità il consumatore ha diritto al ripristino della conformità del bene (riparazione o sostituzione) o, alle condizioni di legge, a una riduzione del prezzo o alla risoluzione del contratto. Per attivare la garanzia scrivere a primonailspro@gmail.com descrivendo il difetto e allegando la prova d'acquisto.",
        ],
      },
      {
        heading: "9. Reclami e assistenza clienti",
        body: [
          "Per qualsiasi richiesta, reclamo o informazione è possibile contattare l'assistenza clienti all'indirizzo primonailspro@gmail.com. I reclami sono gestiti nel più breve tempo possibile.",
        ],
      },
      {
        heading: "10. Risoluzione delle controversie (ODR / ADR)",
        body: [
          "Ai sensi dell'art. 14 del Reg. (UE) 524/2013, la Commissione Europea mette a disposizione dei consumatori una piattaforma per la risoluzione online delle controversie (ODR), accessibile all'indirizzo: https://ec.europa.eu/consumers/odr. L'indirizzo e-mail del venditore è primonailspro@gmail.com.",
          "Il consumatore residente in Europa può inoltre ricorrere agli organismi di risoluzione alternativa delle controversie (ADR) competenti. [[Indicare l'eventuale organismo ADR a cui il venditore aderisce, se presente.]]",
        ],
      },
      {
        heading: "11. Legge applicabile e foro competente",
        body: [
          "Le presenti condizioni sono regolate dalla legge italiana. Per i consumatori resta ferma l'applicazione delle norme inderogabili del Paese di residenza e la competenza del foro del luogo di residenza o domicilio del consumatore.",
        ],
      },
      {
        heading: "12. Proprietà intellettuale",
        body: [
          "I contenuti del Sito (marchi, testi, immagini, grafica, loghi) sono di proprietà di PriMo Nails o dei rispettivi titolari e sono protetti dalle normative sulla proprietà intellettuale. Ne è vietato l'uso non autorizzato.",
        ],
      },
      {
        heading: "13. Modifiche alle condizioni",
        body: [
          "PriMo Nails si riserva di modificare le presenti condizioni. La versione applicabile a ciascun ordine è quella pubblicata sul Sito al momento dell'invio dell'ordine.",
        ],
      },
    ],
    disclaimer:
      "Il presente documento è una bozza fornita a fini informativi e non costituisce consulenza legale. Le parti contrassegnate tra parentesi quadre devono essere completate e l'intero testo deve essere verificato da un professionista abilitato prima della pubblicazione.",
  },
  en: {
    title: "Terms & Conditions of Sale",
    metaDescription:
      "PriMo Nails general terms of sale: orders, payment, shipping, right of withdrawal and legal guarantee.",
    updatedLabel: "Last updated",
    updated: UPDATED_EN,
    intro: [
      "These General Terms and Conditions of Sale govern the purchase of products on primonails.it (the “Site”). By placing an order, the Customer confirms they have read and fully accepted these terms.",
      "Sales contracts are concluded in Italy and governed by Italian law. For consumers, the mandatory provisions of the Italian Consumer Code (Legislative Decree 206/2005) apply.",
    ],
    sections: [
      {
        heading: "1. Seller information",
        body: [
          "Products are sold by:",
          {
            list: [
              "Legal name: [[Legal name]] (trading as “PriMo Nails”)",
              "Legal form: [[legal form, e.g. sole trader / S.r.l.]]",
              "Registered office: [[full registered-office address]]",
              "Warehouse / logistics: Milan (IT)",
              "VAT number: [[VAT number]] — Tax code: [[Tax code]]",
              "Business Register / REA no.: [[REA number]]",
              "Email: primonailspro@gmail.com — Certified email (PEC): [[PEC address]]",
              "Phone: [[phone number]]",
            ],
          },
        ],
      },
      {
        heading: "2. Purpose",
        body: [
          "These terms govern the distance selling of nail-care and nail-reconstruction products and related accessories offered through the Site, intended for both consumers and professionals.",
        ],
      },
      {
        heading: "3. Products, prices and availability",
        body: [
          "Essential product characteristics are described on each product page. Images are illustrative and may differ slightly from the actual product.",
          "All prices are in Euro (EUR) and are final. The sale is not subject to VAT under Article 1, paragraphs 54-89, of Italian Law No. 190/2014 (flat-rate scheme, \"regime forfettario\"): the price shown is the amount actually due and no VAT is charged on top. Shipping costs, if any, are shown separately before order confirmation.",
          "PriMo Nails may change prices at any time; the price applied is the one shown on the Site when the order is submitted.",
          "Availability is kept up to date but not guaranteed in real time. If a product becomes unavailable, the Customer will be informed and refunded any amount already paid.",
        ],
      },
      {
        heading: "4. Conclusion of the contract",
        body: [
          "An order placed through the Site constitutes a contractual offer. The contract is concluded when PriMo Nails sends the order confirmation to the email address provided.",
          "Before submitting, the Customer can review and correct input errors. Keeping the order confirmation is recommended.",
        ],
      },
      {
        heading: "5. Payment",
        body: [
          "Payments are processed via the Nexi XPay gateway, supporting credit/debit cards and other available methods. Payment data is handled securely by the provider; PriMo Nails does not store full card details.",
          "Payment is charged upon order confirmation, unless otherwise stated.",
        ],
      },
      {
        heading: "6. Shipping and delivery",
        body: [
          "Orders are shipped via the GLS courier to Italy and served European Union countries, dispatched from the Milan warehouse.",
          "Estimated costs and delivery times are shown during checkout and may vary by destination. Where applicable, free shipping applies above the order threshold shown on the Site.",
          "The risk of loss or damage passes to the consumer upon physical delivery of the goods.",
          "[[Check any shipping restrictions for certain products, e.g. flammable/UN-classified items, to some destinations.]]",
        ],
      },
      {
        heading: "7. Right of withdrawal",
        body: [
          "A consumer Customer may withdraw from the contract, without giving any reason, within 14 days from the day they physically receive the goods (Articles 52 ff. of the Consumer Code).",
          "To exercise withdrawal, the Customer must inform PriMo Nails with an explicit statement sent to primonailspro@gmail.com, optionally using the model withdrawal form in Annex I, Part B of the Consumer Code.",
          "Goods must be returned without undue delay and within 14 days of the withdrawal notice, to: [[full returns address]].",
          "Unless otherwise stated, the direct cost of returning the goods is borne by the Customer.",
          "PriMo Nails will refund payments received (including standard delivery costs) without undue delay and within 14 days of the withdrawal notice, and may withhold the refund until the goods are received back or proof of return shipment is provided.",
          "Exclusions: the right of withdrawal does not apply, among others, to sealed goods which are not suitable for return for health-protection or hygiene reasons and which were unsealed after delivery (Art. 59 Consumer Code). [[Confirm with a lawyer which product categories (e.g. opened cosmetics / nail products) fall under this exclusion.]]",
        ],
      },
      {
        heading: "8. Legal guarantee of conformity",
        body: [
          "Products are covered by the legal guarantee of conformity for consumers under Articles 128 ff. of the Consumer Code, lasting 24 months from delivery.",
          "In case of a lack of conformity, the consumer is entitled to have conformity restored (repair or replacement) or, under the conditions set by law, to a price reduction or contract termination. To claim, write to primonailspro@gmail.com describing the defect and attaching proof of purchase.",
        ],
      },
      {
        heading: "9. Complaints and customer service",
        body: [
          "For any request, complaint or information, contact customer service at primonailspro@gmail.com. Complaints are handled as promptly as possible.",
        ],
      },
      {
        heading: "10. Dispute resolution (ODR / ADR)",
        body: [
          "Under Article 14 of Reg. (EU) 524/2013, the European Commission provides consumers with an Online Dispute Resolution (ODR) platform at: https://ec.europa.eu/consumers/odr. The seller's email is primonailspro@gmail.com.",
          "Consumers resident in Europe may also use the competent Alternative Dispute Resolution (ADR) bodies. [[Indicate the ADR body the seller adheres to, if any.]]",
        ],
      },
      {
        heading: "11. Governing law and jurisdiction",
        body: [
          "These terms are governed by Italian law. For consumers, the mandatory rules of their country of residence and the jurisdiction of their place of residence or domicile remain unaffected.",
        ],
      },
      {
        heading: "12. Intellectual property",
        body: [
          "The Site's content (trademarks, text, images, graphics, logos) belongs to PriMo Nails or its respective owners and is protected by intellectual-property law. Unauthorized use is prohibited.",
        ],
      },
      {
        heading: "13. Changes to the terms",
        body: [
          "PriMo Nails may amend these terms. The version applicable to each order is the one published on the Site when the order is submitted.",
        ],
      },
    ],
    disclaimer:
      "This document is a draft provided for information only and does not constitute legal advice. The bracketed parts must be completed and the entire text reviewed by a qualified professional before publication.",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// PRIVACY POLICY (incl. Cookie section)
// ─────────────────────────────────────────────────────────────────────────

export const PRIVACY: BilingualDoc = {
  it: {
    title: "Informativa sulla Privacy",
    metaDescription:
      "Informativa privacy di PriMo Nails ai sensi del Reg. (UE) 2016/679 (GDPR): dati trattati, finalità, destinatari, diritti e cookie.",
    updatedLabel: "Ultimo aggiornamento",
    updated: UPDATED_IT,
    intro: [
      "La presente informativa descrive come PriMo Nails tratta i dati personali degli utenti del sito primonails.it, ai sensi del Regolamento (UE) 2016/679 (“GDPR”) e della normativa italiana applicabile.",
    ],
    sections: [
      {
        heading: "1. Titolare del trattamento",
        body: [
          "Il Titolare del trattamento è:",
          {
            list: [
              "[[Ragione sociale]] (marchio “PriMo Nails”)",
              "Sede legale: [[indirizzo completo della sede legale]]",
              "Partita IVA: [[Partita IVA]]",
              "E-mail: primonailspro@gmail.com — PEC: [[indirizzo PEC]]",
            ],
          },
          "Il Titolare non ha nominato un Responsabile della protezione dei dati (DPO), non ricorrendone i presupposti di legge. [[Verificare: inserire i dati del DPO se nominato.]]",
        ],
      },
      {
        heading: "2. Dati personali trattati",
        body: [
          {
            list: [
              "Dati identificativi e di contatto: nome, cognome, e-mail, telefono, indirizzo di spedizione e fatturazione;",
              "Dati relativi agli ordini: prodotti acquistati, importi, storico ordini;",
              "Dati di pagamento: gestiti in forma tokenizzata dal fornitore di pagamento; il Titolare non conserva i dati completi della carta;",
              "Dati tecnici: indirizzo IP, tipo di browser e dispositivo, dati di navigazione strettamente necessari;",
              "Dati di marketing: stato dell'iscrizione alla newsletter e preferenze di comunicazione (se prestato il consenso).",
            ],
          },
        ],
      },
      {
        heading: "3. Finalità e basi giuridiche",
        body: [
          {
            list: [
              "Esecuzione del contratto (art. 6.1.b GDPR): gestione di ordini, pagamenti, spedizioni e assistenza;",
              "Obbligo legale (art. 6.1.c GDPR): adempimenti fiscali e contabili;",
              "Consenso (art. 6.1.a GDPR): invio della newsletter e comunicazioni di marketing; il consenso è revocabile in qualsiasi momento;",
              "Legittimo interesse (art. 6.1.f GDPR): sicurezza del sito, prevenzione delle frodi e diagnostica degli errori.",
            ],
          },
        ],
      },
      {
        heading: "4. Periodo di conservazione",
        body: [
          {
            list: [
              "Dati degli ordini e documenti fiscali: 10 anni, come previsto dalla normativa fiscale italiana;",
              "Dati di marketing: fino alla revoca del consenso o alla disiscrizione;",
              "Log tecnici: per il tempo strettamente necessario alla sicurezza e alla diagnostica;",
              "Dati dell'eventuale account: fino alla richiesta di cancellazione, fatti salvi gli obblighi di legge.",
            ],
          },
        ],
      },
      {
        heading: "5. Destinatari e responsabili del trattamento",
        body: [
          "I dati possono essere comunicati a soggetti che forniscono servizi funzionali all'erogazione del servizio, nominati responsabili del trattamento ove previsto:",
          {
            list: [
              "Nexi XPay — gestione dei pagamenti;",
              "GLS — spedizione e consegna degli ordini;",
              "Postmark (ActiveCampaign, LLC) — invio di e-mail transazionali e newsletter;",
              "DigitalOcean — hosting dell'infrastruttura (data center di Francoforte, UE);",
              "Sentry (Functional Software, Inc.) — monitoraggio degli errori applicativi (regione UE).",
            ],
          },
          "I dati non sono oggetto di diffusione né di vendita a terzi.",
        ],
      },
      {
        heading: "6. Trasferimenti extra-UE",
        body: [
          "L'infrastruttura di hosting è localizzata nell'Unione Europea (Francoforte). Alcuni fornitori (es. Postmark, Sentry) possono avere sede negli Stati Uniti: in tal caso il trasferimento avviene sulla base di garanzie adeguate ai sensi degli artt. 44 e ss. del GDPR, quali le Clausole Contrattuali Standard della Commissione Europea. [[Verificare le garanzie in essere con ciascun fornitore.]]",
        ],
      },
      {
        heading: "7. Diritti dell'interessato",
        body: [
          "L'interessato può esercitare in qualsiasi momento i diritti previsti dagli artt. 15-22 GDPR:",
          {
            list: [
              "accesso ai propri dati;",
              "rettifica dei dati inesatti;",
              "cancellazione (“diritto all'oblio”), nei limiti degli obblighi di legge;",
              "limitazione del trattamento;",
              "portabilità dei dati;",
              "opposizione al trattamento;",
              "revoca del consenso, senza pregiudizio per la liceità del trattamento precedente.",
            ],
          },
          "Le richieste possono essere inviate a primonailspro@gmail.com. Il Titolare risponde senza ingiustificato ritardo e comunque entro 30 giorni.",
        ],
      },
      {
        heading: "8. Reclamo all'autorità di controllo",
        body: [
          "L'interessato ha diritto di proporre reclamo al Garante per la protezione dei dati personali: Piazza Venezia n. 11, 00187 Roma — garante@gpdp.it — www.gpdp.it.",
        ],
      },
      {
        heading: "9. Misure di sicurezza",
        body: [
          "Il Titolare adotta misure tecniche e organizzative adeguate a proteggere i dati, tra cui cifratura delle connessioni (HTTPS/TLS), controlli di accesso e aggiornamenti di sicurezza.",
        ],
      },
      {
        heading: "10. Cookie e tecnologie simili",
        body: [
          "Il Sito utilizza esclusivamente cookie e memorizzazioni locali tecnici/funzionali di prima parte, necessari al funzionamento del servizio. Non sono utilizzati cookie di profilazione, analitici di terze parti o di marketing.",
          "Memorizzazioni utilizzate: identificativo del carrello, preferenza di lingua, prodotti visti di recente, chiusura del popup newsletter e cache dei contenuti del sito.",
          "Poiché non sono impiegati strumenti di profilazione, non è richiesto un banner di consenso ai cookie; l'utente può in ogni caso gestire o cancellare le memorizzazioni locali dalle impostazioni del proprio browser. [[Se in futuro verranno introdotti strumenti analitici o di marketing, sarà necessario un banner di consenso e una cookie policy dedicata.]]",
        ],
      },
      {
        heading: "11. Minori",
        body: [
          "Il Sito non è destinato ai minori e non raccoglie consapevolmente dati di minori senza il consenso di chi ne esercita la responsabilità genitoriale.",
        ],
      },
      {
        heading: "12. Modifiche alla presente informativa",
        body: [
          "Il Titolare si riserva di aggiornare la presente informativa. La versione vigente è quella pubblicata sul Sito con la relativa data di ultimo aggiornamento.",
        ],
      },
      {
        heading: "13. Contatti",
        body: ["Per qualsiasi richiesta in materia di privacy: primonailspro@gmail.com."],
      },
    ],
    disclaimer:
      "Il presente documento è una bozza fornita a fini informativi e non costituisce consulenza legale. Le parti contrassegnate tra parentesi quadre devono essere completate e l'intero testo deve essere verificato da un professionista abilitato prima della pubblicazione.",
  },
  en: {
    title: "Privacy Policy",
    metaDescription:
      "PriMo Nails privacy policy under Reg. (EU) 2016/679 (GDPR): data processed, purposes, recipients, rights and cookies.",
    updatedLabel: "Last updated",
    updated: UPDATED_EN,
    intro: [
      "This policy explains how PriMo Nails processes the personal data of users of primonails.it, in accordance with Regulation (EU) 2016/679 (“GDPR”) and applicable Italian law.",
    ],
    sections: [
      {
        heading: "1. Data controller",
        body: [
          "The data controller is:",
          {
            list: [
              "[[Legal name]] (trading as “PriMo Nails”)",
              "Registered office: [[full registered-office address]]",
              "VAT number: [[VAT number]]",
              "Email: primonailspro@gmail.com — Certified email (PEC): [[PEC address]]",
            ],
          },
          "The controller has not appointed a Data Protection Officer (DPO), the legal conditions not being met. [[Verify: add DPO details if one is appointed.]]",
        ],
      },
      {
        heading: "2. Personal data processed",
        body: [
          {
            list: [
              "Identification and contact data: first and last name, email, phone, shipping and billing address;",
              "Order data: products purchased, amounts, order history;",
              "Payment data: handled in tokenized form by the payment provider; the controller does not store full card details;",
              "Technical data: IP address, browser and device type, strictly necessary browsing data;",
              "Marketing data: newsletter subscription status and communication preferences (where consent is given).",
            ],
          },
        ],
      },
      {
        heading: "3. Purposes and legal bases",
        body: [
          {
            list: [
              "Performance of the contract (Art. 6.1.b GDPR): handling orders, payments, shipping and support;",
              "Legal obligation (Art. 6.1.c GDPR): tax and accounting requirements;",
              "Consent (Art. 6.1.a GDPR): sending the newsletter and marketing communications; consent can be withdrawn at any time;",
              "Legitimate interest (Art. 6.1.f GDPR): site security, fraud prevention and error diagnostics.",
            ],
          },
        ],
      },
      {
        heading: "4. Retention periods",
        body: [
          {
            list: [
              "Order data and tax documents: 10 years, as required by Italian tax law;",
              "Marketing data: until consent is withdrawn or the user unsubscribes;",
              "Technical logs: for as long as strictly necessary for security and diagnostics;",
              "Account data (if any): until a deletion request, subject to legal obligations.",
            ],
          },
        ],
      },
      {
        heading: "5. Recipients and processors",
        body: [
          "Data may be shared with providers of services necessary to deliver the service, appointed as data processors where applicable:",
          {
            list: [
              "Nexi XPay — payment processing;",
              "GLS — shipping and delivery of orders;",
              "Postmark (ActiveCampaign, LLC) — transactional emails and newsletter;",
              "DigitalOcean — infrastructure hosting (Frankfurt data center, EU);",
              "Sentry (Functional Software, Inc.) — application error monitoring (EU region).",
            ],
          },
          "Data is neither disclosed to the public nor sold to third parties.",
        ],
      },
      {
        heading: "6. Transfers outside the EU",
        body: [
          "Hosting infrastructure is located in the European Union (Frankfurt). Some providers (e.g. Postmark, Sentry) may be based in the United States: in that case the transfer relies on appropriate safeguards under Articles 44 ff. GDPR, such as the European Commission's Standard Contractual Clauses. [[Verify the safeguards in place with each provider.]]",
        ],
      },
      {
        heading: "7. Your rights",
        body: [
          "You may exercise the rights under Articles 15-22 GDPR at any time:",
          {
            list: [
              "access to your data;",
              "rectification of inaccurate data;",
              "erasure (“right to be forgotten”), within legal limits;",
              "restriction of processing;",
              "data portability;",
              "objection to processing;",
              "withdrawal of consent, without affecting the lawfulness of prior processing.",
            ],
          },
          "Requests can be sent to primonailspro@gmail.com. The controller responds without undue delay and within 30 days.",
        ],
      },
      {
        heading: "8. Complaint to the supervisory authority",
        body: [
          "You have the right to lodge a complaint with the Italian Data Protection Authority (Garante per la protezione dei dati personali): Piazza Venezia 11, 00187 Rome — garante@gpdp.it — www.gpdp.it.",
        ],
      },
      {
        heading: "9. Security measures",
        body: [
          "The controller adopts appropriate technical and organizational measures to protect data, including connection encryption (HTTPS/TLS), access controls and security updates.",
        ],
      },
      {
        heading: "10. Cookies and similar technologies",
        body: [
          "The Site uses only first-party technical/functional cookies and local storage necessary for the service to work. No third-party analytics, profiling or marketing cookies are used.",
          "Storage used: cart identifier, language preference, recently viewed products, newsletter-popup dismissal and site-content cache.",
          "Since no profiling tools are used, a cookie consent banner is not required; you can still manage or clear local storage from your browser settings. [[If analytics or marketing tools are introduced in future, a consent banner and a dedicated cookie policy will be required.]]",
        ],
      },
      {
        heading: "11. Minors",
        body: [
          "The Site is not directed to minors and does not knowingly collect minors' data without the consent of the person holding parental responsibility.",
        ],
      },
      {
        heading: "12. Changes to this policy",
        body: [
          "The controller may update this policy. The version in force is the one published on the Site with its last-updated date.",
        ],
      },
      {
        heading: "13. Contact",
        body: ["For any privacy request: primonailspro@gmail.com."],
      },
    ],
    disclaimer:
      "This document is a draft provided for information only and does not constitute legal advice. The bracketed parts must be completed and the entire text reviewed by a qualified professional before publication.",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// SHIPPING & RETURNS
// ─────────────────────────────────────────────────────────────────────────
//
// NOTE (MONEY-004, resolved): the Shipping PAGE (pages/ShippingPage.tsx) now
// renders per-zone prices + free-shipping thresholds DATA-DRIVEN from the live
// `shipping_rates` store setting, so it can't drift from checkout. This SHIPPING
// legal doc is still used for the surrounding INFO sections (courier, delivery
// times, tracking, returns, contacts); its "Costi di spedizione" / "Shipping
// costs" section is intentionally SKIPPED by ShippingPage (prices come from the
// setting instead). No manual price-sync required here anymore.
//
export const SHIPPING: BilingualDoc = {
  it: {
    title: "Spedizioni e Resi",
    metaDescription:
      "Spedizioni PriMo Nails: aree servite, costi, tempi di consegna, tracciamento e resi.",
    updatedLabel: "Ultimo aggiornamento",
    updated: UPDATED_IT,
    intro: [
      "Questa pagina riepiloga modalità, costi e tempi di spedizione, oltre alle regole per i resi. Per le condizioni contrattuali complete si rimanda ai Termini e Condizioni di Vendita.",
    ],
    sections: [
      {
        heading: "1. Aree servite",
        body: [
          "Spediamo in Italia e nei Paesi dell'Unione Europea serviti dal nostro corriere. Tutti gli ordini partono dal magazzino di Milano.",
          "[[Confermare eventuali Paesi esclusi o destinazioni con condizioni particolari, es. isole minori o località disagiate.]]",
        ],
      },
      {
        heading: "2. Corriere",
        body: [
          "Le spedizioni sono affidate a GLS, con partenza dal magazzino di Milano, con consegna Standard in 3–5 giorni lavorativi. Il costo viene mostrato al checkout in base alla destinazione e al peso dell'ordine.",
        ],
      },
      {
        heading: "3. Costi di spedizione",
        body: [
          "Il costo dipende dalla destinazione e dal peso dell'ordine; l'importo definitivo è calcolato e mostrato al checkout. Tutti i prezzi sono IVA inclusa.",
          "Tariffe indicative (IVA inclusa) per una spedizione fino a circa 5 kg; per ordini più pesanti il costo aumenta ed è calcolato al checkout:",
          {
            list: [
              "Italia continentale — € 7,50;",
              "Italia meridionale, Sicilia e Calabria — € 10,00;",
              "Sardegna — € 20,00;",
              "Unione Europea — Zona 1 — € 18,00;",
              "Unione Europea — Zona 2 — € 26,00;",
              "Isole UE (Cipro, Malta, Finlandia) — a partire da € 37,00.",
            ],
          },
          "Paesi UE per zona — Zona 1: Austria, Belgio, Lussemburgo, Germania, Paesi Bassi, Danimarca, Francia, Spagna, Portogallo, Slovenia, Croazia, Polonia, Rep. Ceca, Ungheria, Romania, Slovacchia. Zona 2: Bulgaria, Estonia, Grecia, Irlanda, Lettonia, Lituania, Svezia.",
          "La spedizione è gratuita per ordini di importo pari o superiore a € 199.",
          "Le tariffe sono indicative e possono essere aggiornate: l'importo applicato è sempre quello mostrato al checkout.",
        ],
      },
      {
        heading: "4. Tempi di lavorazione e consegna",
        body: [
          "Gli ordini vengono elaborati e affidati a GLS entro [[1–2]] giorni lavorativi dalla conferma del pagamento.",
          "Tempi di consegna GLS stimati dalla presa in carico: 3–5 giorni lavorativi. Per le destinazioni dell'Unione Europea i tempi possono essere superiori in base alla zona.",
          "I tempi indicati sono stimati e non vincolanti: possono variare in funzione della destinazione, di periodi di alta stagione o festività e di cause non imputabili al venditore.",
        ],
      },
      {
        heading: "5. Tracciamento",
        body: [
          "Alla partenza dell'ordine invieremo un'e-mail con il numero di tracking e il link per seguire la spedizione.",
        ],
      },
      {
        heading: "6. Colli danneggiati, smarriti o in ritardo",
        body: [
          "Al momento della consegna verificare l'integrità dell'imballo. In presenza di colli visibilmente danneggiati o manomessi, è consigliabile accettare la consegna con riserva di controllo (“accetto con riserva”) oppure rifiutarla, contattandoci quanto prima.",
          "In caso di ritardo o mancata consegna, contattare l'assistenza a primonailspro@gmail.com: ci attiveremo con il corriere per risolvere il problema.",
        ],
      },
      {
        heading: "7. Resi e diritto di recesso",
        body: [
          "Il Cliente consumatore può esercitare il diritto di recesso entro 14 giorni dal ricevimento dei beni, secondo quanto previsto dai Termini e Condizioni di Vendita e dal Codice del Consumo.",
          "Per avviare un reso, scrivere a primonailspro@gmail.com. I beni devono essere restituiti integri, non utilizzati e nella confezione originale, al seguente indirizzo: [[indirizzo completo per i resi]].",
          "Salvo diversa indicazione, i costi diretti di restituzione sono a carico del Cliente. Il rimborso è effettuato entro 14 giorni secondo quanto previsto dai Termini.",
        ],
      },
      {
        heading: "8. Prodotti che non si possono rendere",
        body: [
          "Alcuni prodotti sigillati per motivi igienici o di tutela della salute non possono essere resi una volta aperti (art. 59 Codice del Consumo). [[Confermare con un legale le categorie di prodotto interessate.]]",
        ],
      },
      {
        heading: "9. Contatti",
        body: [
          "Per domande su spedizioni e resi: primonailspro@gmail.com — +39 389 319 3049.",
        ],
      },
    ],
    disclaimer:
      "Il presente documento è una bozza fornita a fini informativi e non costituisce consulenza legale. Le parti contrassegnate tra parentesi quadre devono essere completate e verificate prima della pubblicazione.",
  },
  en: {
    title: "Shipping & Returns",
    metaDescription:
      "PriMo Nails shipping: served areas, costs, delivery times, tracking and returns.",
    updatedLabel: "Last updated",
    updated: UPDATED_EN,
    intro: [
      "This page summarizes shipping methods, costs and times, along with the rules for returns. For the full contractual terms, please refer to the Terms & Conditions of Sale.",
    ],
    sections: [
      {
        heading: "1. Served areas",
        body: [
          "We ship to Italy and to the European Union countries served by our courier. All orders are dispatched from the Milan warehouse.",
          "[[Confirm any excluded countries or destinations with special conditions, e.g. minor islands or remote areas.]]",
        ],
      },
      {
        heading: "2. Courier",
        body: [
          "Shipments are handled by GLS, dispatched from the Milan warehouse, with Standard delivery in 3–5 business days. The cost is shown at checkout based on destination and order weight.",
        ],
      },
      {
        heading: "3. Shipping costs",
        body: [
          "Cost depends on destination and order weight; the final amount is calculated and shown at checkout. All prices include VAT.",
          "Indicative rates (VAT included) for a parcel up to about 5 kg; heavier orders cost more and are calculated at checkout:",
          {
            list: [
              "Mainland Italy — € 7.50;",
              "Southern Italy, Sicily and Calabria — € 10.00;",
              "Sardinia — € 20.00;",
              "European Union — Zone 1 — € 18.00;",
              "European Union — Zone 2 — € 26.00;",
              "EU Islands (Cyprus, Malta, Finland) — from € 37.00.",
            ],
          },
          "EU countries by zone — Zone 1: Austria, Belgium, Luxembourg, Germany, Netherlands, Denmark, France, Spain, Portugal, Slovenia, Croatia, Poland, Czechia, Hungary, Romania, Slovakia. Zone 2: Bulgaria, Estonia, Greece, Ireland, Latvia, Lithuania, Sweden.",
          "Shipping is free for orders equal to or above € 199.",
          "The rates are indicative and may be updated: the amount applied is always the one shown at checkout.",
        ],
      },
      {
        heading: "4. Processing and delivery times",
        body: [
          "Orders are processed and handed to GLS within [[1–2]] business days of payment confirmation.",
          "Estimated GLS delivery time from pickup: 3–5 business days. For EU destinations, times may be longer depending on the zone.",
          "These times are estimates and not binding: they may vary depending on destination, peak periods or holidays, and causes beyond the seller's control.",
        ],
      },
      {
        heading: "5. Tracking",
        body: [
          "When your order ships, we'll send an email with the tracking number and a link to follow the delivery.",
        ],
      },
      {
        heading: "6. Damaged, lost or delayed parcels",
        body: [
          "On delivery, check that the packaging is intact. If a parcel is visibly damaged or tampered with, we recommend accepting it “subject to inspection” or refusing it, and contacting us as soon as possible.",
          "For delays or non-delivery, contact us at primonailspro@gmail.com: we'll follow up with the courier to resolve the issue.",
        ],
      },
      {
        heading: "7. Returns and right of withdrawal",
        body: [
          "A consumer Customer may exercise the right of withdrawal within 14 days of receiving the goods, as set out in the Terms & Conditions of Sale and the Consumer Code.",
          "To start a return, write to primonailspro@gmail.com. Goods must be returned intact, unused and in their original packaging, to: [[full returns address]].",
          "Unless otherwise stated, the direct cost of returning the goods is borne by the Customer. Refunds are issued within 14 days as set out in the Terms.",
        ],
      },
      {
        heading: "8. Products that can't be returned",
        body: [
          "Certain goods sealed for hygiene or health-protection reasons are not suitable for return once opened (Art. 59 Consumer Code). [[Confirm with a lawyer which product categories are affected.]]",
        ],
      },
      {
        heading: "9. Contact",
        body: [
          "For shipping and returns questions: primonailspro@gmail.com — +39 389 319 3049.",
        ],
      },
    ],
    disclaimer:
      "This document is a draft provided for information only and does not constitute legal advice. The bracketed parts must be completed and verified before publication.",
  },
};
