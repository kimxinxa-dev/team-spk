'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  Button,
  ConfirmDialog,
  Empty,
  FieldError,
  Loading,
  Notice,
  inputClass,
  newRequestId,
  shortDate,
} from '@/components/ui';
import { usePagedList } from '@/components/use-paged-list';
import type { GuideNoteView } from '@/lib/data/guides';
import { GUIDES, findGuide, matchGuides, type Guide } from '@/lib/guides';
import {
  deleteNote,
  listNotes,
  practiceNote,
  renameNote,
  saveNote,
} from './actions';
import { VirtualPhone, speak } from './virtual-phone';

/** 브라우저 음성 인식(크롬·삼성 인터넷 등 내장 기능)의 최소 형태 */
type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function createRecognition(): Recognition | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function AskClient() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [questionError, setQuestionError] = useState<string>();
  const [listening, setListening] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [others, setOthers] = useState<Guide[]>([]);
  const [noMatch, setNoMatch] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<{
    busy: boolean;
    error?: string;
    savedId?: string;
  }>({ busy: false });
  const requestId = useRef(newRequestId());
  const notes = usePagedList<GuideNoteView>(listNotes);
  const phoneRef = useRef<HTMLDivElement>(null);

  function open(g: Guide, noteId: string | null) {
    setGuide(g);
    setActiveNoteId(noteId);
    setSaveState({ busy: false, savedId: noteId ?? undefined });
    requestId.current = newRequestId();
    speak(g.steps[0].instruction);
    requestAnimationFrame(() =>
      phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  function ask(text: string) {
    const q = text.trim();
    if (q.length < 2) {
      setQuestionError('하고 싶은 일을 두 글자 이상 말하거나 적어 주세요.');
      return;
    }
    const { best, others: rest } = matchGuides(q);
    setOthers(rest);
    setNoMatch(!best);
    if (best) open(best, null);
    else setGuide(null);
  }

  function listen() {
    const rec = createRecognition();
    if (!rec) {
      setQuestionError(
        '이 브라우저에서는 말하기를 쓸 수 없어요. 아래 칸에 글로 적어 주세요.',
      );
      return;
    }
    rec.lang = 'ko-KR';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const heard = e.results[0]?.[0]?.transcript ?? '';
      setQuestion(heard.slice(0, 200));
      setQuestionError(undefined);
      ask(heard);
    };
    rec.onerror = () =>
      setQuestionError('잘 듣지 못했어요. 다시 한번 말해 주세요.');
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  async function save() {
    if (!guide) return;
    setSaveState({ busy: true });
    const res = await saveNote({
      guideKey: guide.key,
      question: question.trim() || guide.title,
      requestId: requestId.current,
    });
    if (!res.ok) {
      if (res.expired) router.push('/login?expired=1');
      setSaveState({ busy: false, error: res.error });
      return;
    }
    setSaveState({ busy: false, savedId: res.data.id });
    setActiveNoteId(res.data.id);
    notes.prepend(res.data);
  }

  async function finished() {
    if (!activeNoteId) return;
    const res = await practiceNote(activeNoteId);
    if (res.ok) {
      const note = notes.items.find((n) => n.id === activeNoteId);
      if (note)
        notes.replace({ ...note, practiceCount: note.practiceCount + 1 });
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <button
          type="button"
          onClick={listen}
          disabled={listening}
          className={`flex min-h-24 w-full flex-col items-center justify-center rounded-3xl text-2xl font-extrabold text-white ${listening ? 'bg-danger' : 'bg-navy'}`}
          aria-live="polite"
        >
          <span aria-hidden className="text-4xl">
            🎤
          </span>
          {listening ? '듣고 있어요… 말씀해 주세요' : '눌러서 말하기'}
        </button>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="space-y-2"
        >
          <label htmlFor="question" className="block text-lg font-bold">
            또는 글로 적기
          </label>
          <div className="flex gap-2">
            <input
              id="question"
              value={question}
              maxLength={200}
              onChange={(e) => {
                setQuestion(e.target.value);
                setQuestionError(undefined);
              }}
              placeholder="예: 사진 보내고 싶어요"
              aria-invalid={!!questionError}
              aria-describedby="question-error"
              className={inputClass}
            />
            <Button type="submit" className="shrink-0">
              찾기
            </Button>
          </div>
          <FieldError id="question-error" message={questionError} />
        </form>
        {noMatch && (
          <Notice kind="info">
            딱 맞는 안내를 찾지 못했어요. 아래에서 골라 보세요.
            <span className="mt-2 flex flex-wrap gap-2">
              {GUIDES.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => open(g, null)}
                  className="min-h-12 rounded-xl border-2 border-navy bg-white px-3 font-bold"
                >
                  {g.title}
                </button>
              ))}
            </span>
          </Notice>
        )}
      </section>

      {guide && (
        <section
          ref={phoneRef}
          aria-labelledby="guide-title"
          className="scroll-mt-20 space-y-4"
        >
          <h2 id="guide-title" className="text-2xl font-extrabold text-navy">
            {guide.title}
          </h2>
          <VirtualPhone
            key={`${guide.key}-${activeNoteId ?? 'new'}`}
            guide={guide}
            onFinished={finished}
          />
          <p className="text-lg text-muted">💡 {guide.tip}</p>
          {saveState.error && <Notice kind="error">{saveState.error}</Notice>}
          {saveState.savedId ? (
            <Notice kind="success">
              배움 노트에 있어요. 끝까지 연습하면 연습 횟수가 올라가요.
            </Notice>
          ) : (
            <Button
              onClick={save}
              loading={saveState.busy}
              variant="secondary"
              className="w-full"
            >
              📒 배움 노트에 저장
            </Button>
          )}
          {others.length > 0 && (
            <p className="flex flex-wrap items-center gap-2 text-lg">
              혹시 이걸 찾으세요?
              {others.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => open(g, null)}
                  className="min-h-12 rounded-xl border-2 border-line px-3 font-bold"
                >
                  {g.title}
                </button>
              ))}
            </p>
          )}
        </section>
      )}

      <Notes
        notes={notes}
        onPractice={(n) =>
          findGuide(n.guideKey) && open(findGuide(n.guideKey)!, n.id)
        }
      />
    </div>
  );
}

function Notes({
  notes,
  onPractice,
}: {
  notes: ReturnType<typeof usePagedList<GuideNoteView>>;
  onPractice: (n: GuideNoteView) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<GuideNoteView | null>(null);
  const [notice, setNotice] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  async function rename(n: GuideNoteView) {
    if (!title.trim()) {
      setError('제목을 넣어 주세요.');
      return;
    }
    setBusy(true);
    const res = await renameNote({ id: n.id, title });
    setBusy(false);
    if (!res.ok) {
      setError(res.fieldErrors?.title ?? res.error);
      return;
    }
    notes.replace({ ...n, title: title.trim() });
    setEditing(null);
    setNotice({ kind: 'success', text: '제목을 고쳤어요.' });
  }

  return (
    <section aria-labelledby="notes" className="space-y-4">
      <h2 id="notes" className="text-2xl font-extrabold text-navy">
        📒 배움 노트
      </h2>
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      <ul className="space-y-3">
        {notes.items.map((n) => (
          <li
            key={n.id}
            className="space-y-2 rounded-3xl border border-line bg-white p-4"
          >
            {editing === n.id ? (
              <div className="space-y-2">
                <label
                  htmlFor={`title-${n.id}`}
                  className="block text-lg font-bold"
                >
                  제목
                </label>
                <input
                  id={`title-${n.id}`}
                  value={title}
                  maxLength={40}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError(undefined);
                  }}
                  aria-invalid={!!error}
                  aria-describedby={`title-${n.id}-error`}
                  className={inputClass}
                />
                <FieldError id={`title-${n.id}-error`} message={error} />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setEditing(null)}
                    disabled={busy}
                  >
                    취소
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => rename(n)}
                    loading={busy}
                  >
                    저장
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xl font-extrabold">{n.title}</p>
                <p className="text-base text-muted">
                  &ldquo;{n.question}&rdquo; · 연습 {n.practiceCount}번 ·{' '}
                  {shortDate(n.createdAt)}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => onPractice(n)}>연습</Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditing(n.id);
                      setTitle(n.title);
                      setError(undefined);
                    }}
                  >
                    고치기
                  </Button>
                  <Button variant="danger" onClick={() => setDeleting(n)}>
                    지우기
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {notes.loading && <Loading />}
      {notes.error && (
        <Notice kind="error" onRetry={notes.reload}>
          {notes.error}
        </Notice>
      )}
      {!notes.loading && !notes.error && notes.items.length === 0 && (
        <Empty>아직 저장한 방법이 없어요. 위에서 물어보고 저장해 보세요.</Empty>
      )}
      {notes.hasMore && !notes.loading && (
        <Button variant="secondary" className="w-full" onClick={notes.more}>
          더 보기
        </Button>
      )}
      <ConfirmDialog
        open={!!deleting}
        title="이 노트를 지울까요?"
        body="지우면 되돌릴 수 없어요."
        confirmLabel="지우기"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteNote(deleting.id);
          if (res.ok) {
            notes.remove(deleting.id);
            setNotice({ kind: 'success', text: '노트를 지웠어요.' });
          } else setNotice({ kind: 'error', text: res.error });
          setDeleting(null);
        }}
      />
    </section>
  );
}
