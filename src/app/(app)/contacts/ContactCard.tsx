'use client';

import { useActionState, useState } from 'react';
import { deleteContact } from './actions';
import { ContactForm } from './ContactForm';
import { FormStatus, SubmitButton } from '@/components/form';
import { INITIAL_RESULT } from '@/lib/action-result';
import type { ContactItem } from '@/lib/queries';

function formatPhone(phone: string) {
  return phone.replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, '$1-$2-$3');
}

export function ContactCard({ contact }: { contact: ContactItem }) {
  const [editing, setEditing] = useState(false);
  const [deleteResult, deleteAction] = useActionState(
    deleteContact,
    INITIAL_RESULT,
  );

  if (editing) {
    return (
      <article className="rounded-2xl border-2 border-blue-200 bg-white p-5">
        <h3 className="text-xl font-bold">{contact.name} 고치기</h3>
        <ContactForm contact={contact} onDone={() => setEditing(false)} />
      </article>
    );
  }

  return (
    <article className="rounded-2xl border-2 border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-2xl font-bold">{contact.name}</h3>
        {contact.relation && (
          <span className="text-lg text-zinc-600">({contact.relation})</span>
        )}
        {contact.isGuardian && (
          <span className="rounded-full bg-blue-100 px-3 py-1 text-base font-bold text-blue-800">
            보호자
          </span>
        )}
      </div>
      <p className="mt-1 text-xl text-zinc-800">{formatPhone(contact.phone)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`tel:${contact.phone}`}
          className="inline-flex min-h-12 items-center rounded-xl bg-green-700 px-5 text-lg font-semibold text-white hover:bg-green-800"
        >
          📞 전화 걸기
        </a>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-h-12 rounded-xl border-2 border-zinc-300 px-5 text-lg font-semibold hover:bg-zinc-50"
        >
          고치기
        </button>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!confirm(`${contact.name} 연락처를 지울까요?`))
              event.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={contact.id} />
          <SubmitButton variant="danger" pendingText="지우는 중…">
            지우기
          </SubmitButton>
        </form>
      </div>
      {!deleteResult.ok && (
        <div className="mt-3">
          <FormStatus result={deleteResult} />
        </div>
      )}
    </article>
  );
}
