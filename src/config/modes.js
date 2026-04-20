// 3자 채팅(사용자 + GPT + Gemini) 모드 정의.
// 각 모드는 UI 메타 정보와, 모드·화자별 시스템 프롬프트 생성기를 포함합니다.

export const MODES = [
  {
    id: 'free',
    emoji: '💭',
    title: '자유 대화',
    desc: '나, GPT, Gemini 셋이서 자유롭게 대화합니다.',
    requiresTopic: false,
    topicPlaceholder: '',
    topicLabel: '',
  },
  {
    id: 'debate',
    emoji: '⚔️',
    title: '토론',
    desc: 'GPT(찬성) vs Gemini(반대). 내가 의견을 던지면 둘 다 반응합니다.',
    requiresTopic: true,
    topicPlaceholder: '예: AI가 예술가를 대체할 수 있을까?',
    topicLabel: '토론 주제',
  },
  {
    id: 'roleplay',
    emoji: '🎭',
    title: '역할극',
    desc: 'GPT와 Gemini가 각자 역할을 맡고, 나도 대화에 참여합니다.',
    requiresTopic: true,
    topicPlaceholder: '예: 면접관(GPT)과 지원자(Gemini), 나는 관찰자',
    topicLabel: '상황 설명',
  },
];

// 모드 id와 speaker('gpt' | 'gemini')에 맞는 시스템 프롬프트 생성.
// 모든 프롬프트에 "사용자 + 상대 AI와의 3자 채팅방" 맥락을 명시합니다.
export function buildSystemPrompt(modeId, topic, speaker) {
  const isGpt = speaker === 'gpt';
  const selfName = isGpt ? 'GPT' : 'Gemini';
  const otherName = isGpt ? 'Gemini' : 'GPT';

  // GPT에게만 web_search 도구 사용 지침 안내(Gemini는 자동 grounding)
  const toolHint = isGpt
    ? ' 최신 정보(뉴스, 오늘 날짜·날씨, 최근 사건 등)가 필요하면 web_search 도구를 사용하세요.'
    : '';

  if (modeId === 'free') {
    if (isGpt) {
      return `당신은 ${selfName}입니다. 사용자와 다른 AI인 ${otherName}, 이렇게 셋이서 대화하는 채팅방에 있습니다. 사용자의 메시지에 주로 반응하되, ${otherName}가 앞서 한 발언이 있다면 참고하거나 자연스럽게 언급해도 좋습니다. 친근하고 호기심 많은 어투로 2~4문장, 한국어로 답하세요.${toolHint}`;
    }
    return `당신은 ${selfName}입니다. 사용자와 다른 AI인 ${otherName}, 이렇게 셋이서 대화하는 채팅방에 있습니다. 방금 사용자가 보낸 메시지와 ${otherName}의 답변을 모두 보고 있습니다. 사용자에게 응답하되, 필요하면 ${otherName}의 답변을 보충·반박·동의 등으로 자연스럽게 엮어주세요. 사려 깊고 차분한 어투로 2~4문장, 한국어로 답하세요.`;
  }

  if (modeId === 'debate') {
    if (isGpt) {
      return `당신은 ${selfName}입니다. 사용자, 그리고 다른 AI인 ${otherName}와 함께 "${topic}" 주제로 토론하고 있습니다. 당신은 찬성/긍정 입장을 대변합니다. 사용자의 의견에 반응하면서 찬성 논리를 펼치세요. ${otherName}(반대 입장)가 이미 발언했다면 그 논지를 반박해도 좋습니다. 2~4문장, 한국어, 논리적이고 존중하는 어투로.${toolHint}`;
    }
    return `당신은 ${selfName}입니다. 사용자, 그리고 다른 AI인 ${otherName}와 함께 "${topic}" 주제로 토론하고 있습니다. 당신은 반대/부정 입장을 대변합니다. 사용자의 의견에 반응하면서 반대 논리를 펼치세요. ${otherName}(찬성 입장)가 방금 발언했다면 그 주장을 짚고 반박하세요. 2~4문장, 한국어, 논리적이고 존중하는 어투로.`;
  }

  if (modeId === 'roleplay') {
    if (isGpt) {
      return `당신은 ${selfName}입니다. 사용자, 그리고 다른 AI인 ${otherName}와 함께 다음 상황의 역할극을 수행합니다: "${topic}". 설명에서 첫 번째로 언급된 역할을 당신이 맡고, ${otherName}가 두 번째 역할을 맡습니다. 사용자는 제3자 혹은 관찰자·참여자로 대화에 끼어들 수 있습니다. 몰입감 있게 당신의 역할을 연기하면서 사용자와 ${otherName} 양쪽에 자연스럽게 반응하세요. 2~4문장, 한국어.${toolHint}`;
    }
    return `당신은 ${selfName}입니다. 사용자, 그리고 다른 AI인 ${otherName}와 함께 다음 상황의 역할극을 수행합니다: "${topic}". 설명에서 두 번째로 언급된 역할을 당신이 맡고, ${otherName}가 첫 번째 역할을 맡습니다. 사용자는 제3자 혹은 관찰자·참여자로 대화에 끼어들 수 있습니다. 몰입감 있게 당신의 역할을 연기하면서 사용자와 ${otherName} 양쪽에 자연스럽게 반응하세요. 2~4문장, 한국어.`;
  }

  // 안전망: 알 수 없는 모드면 자유 대화로 폴백
  return `당신은 ${selfName}입니다. 사용자와 ${otherName}, 셋이서 대화 중입니다. 2~4문장으로 한국어로 자연스럽게 답하세요.${toolHint}`;
}

// 모드별 머리말(헤더 표시용)
export function modeTitle(modeId) {
  const m = MODES.find((x) => x.id === modeId);
  return m ? `${m.emoji} ${m.title}` : '대화';
}
