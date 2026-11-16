# 이미지 제작

## 원칙

| 원칙 | 이유 |
|---|---|
| AI 이미지에는 글자를 넣지 않는다 | AI가 한글을 깨뜨리거나 틀린 용어를 넣는다. 라벨은 HTML로 직접 얹는다 |
| 의학적 위치(층, 깊이, 부위)는 AI에 맡기지 않는다 | 원고와 다르게 그리면 거짓 정보(제3호)가 된다. 위치 표시는 오버레이로 직접 그리고, AI가 그린 부분은 문헌과 눈으로 대조한다 |
| 실제 인물 사진풍, 시술 장면, 전후 비교, 기기 상표 금지 | 제2호(경험담 오인), 제6호(시술 장면), 비교 광고 |
| 사람은 따뜻한 수채화 일러스트로만 | 실제 환자로 오인되지 않게 |
| 생성 기록을 남긴다 | 심의·문의 때 출처를 설명하기 위해서 |

## 사람 일러스트

- 궁금해하거나 고민하는 모습만 그린다. 거울을 보며 피부를 살피는 장면, 볼을 가만히 짚는 장면처럼.
- 좋아진 얼굴은 그리지 않는다. 두 장을 나란히 놓아 전후 비교처럼 읽히는 구성도 금지한다.
- 울거나 절망하는 과장은 금지한다. 차분한 표정으로 그린다.
- 글 주제와 맞는 장면만 쓴다. 흉터 글에 매끈한 피부 모델을 넣지 않는다.
- 이미지 바로 아래에 반드시 붙인다:
  ```
  *AI로 만든 일러스트이며 실제 환자가 아닙니다.*
  ```
  검사기는 이 문장의 "환자"를 예외로 처리한다.

## 생성 도구

사용자가 정한 도구를 쓴다. 지금까지 쓴 두 가지:

**1) 빠나나 AI 커넥터** (연결돼 있을 때 기본)
- 모델: `GPT Image 2.6 Sunburst`, high, 2K. 장당 약 2.7크레딧.
- 연결이 끊겼다고 나오면 사용자에게 커넥터 설정에서 다시 연결해 달라고 하고, 그동안 Codex로 시안을 만든다.

**2) Codex CLI 내장 이미지 생성**
```bash
codex exec -s workspace-write -C <글 폴더> "Use your image generation tool to create ONE image (landscape 3:2, high quality) and save it as ./images/raw/<이름>-ai.png (copy it from wherever the tool saved it). Do not create or edit any other files. Image prompt: <프롬프트>" > src/codex-run.log 2>&1
```

프롬프트 끝에는 항상 다음을 붙인다.
- 도식: `No text, no letters, no numbers, no labels, no arrows, no devices or handpieces, no people, no faces, no blood.`
- 사람 일러스트: `Soft watercolor illustration, calm and thoughtful expression, not a photograph. No text, no letters, no before-and-after, no medical procedure, no devices.`

## 라벨 얹기와 렌더

1. `src/<이름>-ai.html`에 SVG를 만들고 `<image href="../images/raw/<이름>-ai.png">` 위에 제목, 층 이름, 위치 표시를 얹는다. 글꼴은 `"Apple SD Gothic Neo","Noto Sans KR"`다.
2. PNG로 렌더한다. 시스템 Chrome을 쓴다.
   ```bash
   NODE_PATH=<playwright가 설치된 node_modules> node $SKILL/scripts/render_overlay.js "$PWD/src/<이름>-ai.html" images/<이름>.png
   ```
   기본 크기는 1200×800이고 2배 해상도로 렌더한다. 크기를 바꾸려면 스크립트의 viewport와 clip을 고친다.
3. 렌더된 PNG를 직접 열어 확인한다. 글자 깨짐, 라벨 위치, 원고와의 일치를 본다.

## 원고에 넣기

```markdown
![그림 내용을 20자 이상으로 설명한 대체 문구](images/<이름>.png)
```
- 대체 문구(alt)에 "전후", "before/after", "시술 장면" 같은 말을 쓰지 않는다. 검사기가 잡는다.
- 사람 일러스트는 바로 다음 줄에 고지 문구를 붙인다.

## 생성 기록

`images/raw/PROVENANCE.md`를 쓴다. 틀은 [../assets/provenance-template.md](../assets/provenance-template.md)다.
