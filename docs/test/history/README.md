# overnight 검수 히스토리

`$overnight-harness:overnight-report`가 런마다 생성하는 **런별 사람 검수 체크리스트 인스턴스** 보관 폴더.

- 파일명: `<MMDD-HHMM>-overnight-review-checklist.md` (타임스탬프 = 검수 대상 런의 종료 시각, 콜론 없는 `MMDD-HHMM`).
- 내용: 바이블 `../bible/overnight-review-checklist.md`의 B~E를 그 런 사실(커밋 해시·새 `[blocked]`·ahead 수·잔여 seed)로 채운 체크박스.
- 이 인스턴스 `*.md`는 **gitignore**(재생성 가능한 산출물). 이 `README.md`만 추적된다.
