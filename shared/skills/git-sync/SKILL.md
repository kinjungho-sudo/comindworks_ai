# Skill: git-sync
_Wiki 변경사항 자동 Git 커밋 & 푸시_

## 역할
Wiki 페이지 저장 후 자동으로 git commit & push 실행.

## 트리거
- wiki-collector 스킬 완료 후 자동 호출
- 수동: `"Wiki git push 해줘"`

## 실행
```bash
bash .claude/skills/git-sync/scripts/git_commit_push.sh "[메시지]"
```

## 커밋 메시지 형식
```
wiki: [카테고리] [제목] 저장
wiki: 점검 리포트 업데이트
```
