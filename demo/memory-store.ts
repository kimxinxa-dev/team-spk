// 시뮬레이션용 저장소: 서버 없이 이 페이지 안 메모리에만 둔다(새로 고치면 사라진다).
// 로그인은 실제 앱과 같은 입력 규칙만 확인하고, 비밀번호가 wrongpass이면 틀린 것으로 보여 준다.
import type {
  GuardianContact,
  GuardianStore,
  StoredScan,
} from '../src/lib/phone/guardian-app';
import { analyzeScan } from '../src/lib/scan/analyze';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createMemoryStore(): GuardianStore {
  let email: string | null = null;
  const scans: StoredScan[] = [];
  let contacts: GuardianContact[] = [];
  let n = 1;

  return {
    async session() {
      return email;
    },
    async signIn(input) {
      await wait(500);
      if (input.password === 'wrongpass')
        return { ok: false, message: '이메일 또는 비밀번호가 맞지 않습니다.' };
      email = input.email;
      return { ok: true, email };
    },
    async signUp(input) {
      await wait(500);
      email = input.email;
      return { ok: true, email };
    },
    async signOut() {
      email = null;
    },
    async listScans() {
      return scans.map((s) => ({ ...s }));
    },
    async saveScan(input) {
      const id = `m${n++}`;
      scans.unshift({
        id,
        source: input.source,
        content: input.content,
        result: analyzeScan(
          input.source === 'QR' ? 'QR' : 'MESSAGE',
          input.content,
        ),
        verdict: null,
      });
      return id;
    },
    async setVerdict(id, verdict) {
      const s = scans.find((x) => x.id === id);
      if (s) s.verdict = verdict;
      return Boolean(s);
    },
    async deleteScan(id) {
      const i = scans.findIndex((x) => x.id === id);
      if (i >= 0) scans.splice(i, 1);
      return i >= 0;
    },
    async listContacts() {
      return [...contacts].sort(
        (a, b) =>
          Number(b.isGuardian) - Number(a.isGuardian) ||
          a.name.localeCompare(b.name, 'ko'),
      );
    },
    async addContact(input) {
      const phone = input.phone.replace(/[\s-]/g, '');
      if (contacts.some((c) => c.phone === phone))
        return {
          ok: false,
          message: '이미 등록한 전화번호입니다.',
          fieldErrors: { phone: '이미 등록한 전화번호입니다.' },
        };
      contacts = [
        ...contacts,
        {
          id: `c${n++}`,
          name: input.name.trim(),
          phone,
          relation: input.relation ?? null,
          isGuardian: input.isGuardian,
        },
      ];
      return { ok: true };
    },
    async deleteContact(id) {
      const before = contacts.length;
      contacts = contacts.filter((c) => c.id !== id);
      return contacts.length < before;
    },
  };
}
