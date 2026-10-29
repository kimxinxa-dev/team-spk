import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';
import { listContacts } from '@/lib/queries';
import { ContactCard } from './ContactCard';
import { ContactForm } from './ContactForm';

export const metadata = { title: '연락처 — 안심 지킴이' };

async function ContactList() {
  const user = await requireUser();
  const contacts = await listContacts(user.id);

  if (contacts.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center text-lg text-zinc-600">
        아직 등록한 연락처가 없어요. 위에서 가족이나 보호자를 추가해 보세요.
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {contacts.map((contact) => (
        <li key={contact.id}>
          <ContactCard contact={contact} />
        </li>
      ))}
    </ul>
  );
}

export default function ContactsPage() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="contacts-title">
        <h1 id="contacts-title" className="text-3xl font-bold">
          보호자·연락처
        </h1>
        <p className="mt-2 text-lg text-zinc-700">
          의심스러운 문자를 받았을 때 바로 전화할 가족이나 보호자를 등록하세요.
        </p>
        <ContactForm />
      </section>

      <section aria-labelledby="contact-list-title">
        <h2 id="contact-list-title" className="mb-4 text-2xl font-bold">
          내 연락처
        </h2>
        <Suspense
          fallback={
            <p role="status" className="p-6 text-center text-lg text-zinc-600">
              연락처를 불러오는 중…
            </p>
          }
        >
          <ContactList />
        </Suspense>
      </section>
    </div>
  );
}
