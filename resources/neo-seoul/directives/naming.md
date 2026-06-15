# Neo-Seoul Naming Directives
#
# 고유명사 표기 고정 + 세린 화법(register) 규칙. scenario_context가 generic하게
# directives.naming_rule을 narrative notes에 주입한다(예전의 neo-seoul 전용 if문 대체).
# 코드 default는 없다 → naming.md를 두지 않은 시나리오는 이 규칙을 받지 않는다
# (이전 동작과 동일: 과거에도 neo-seoul만 NEO_SEOUL_NAMING_RULE을 받았다).
#
# 추출 무손실은 byte-parity 테스트가 보증한다(scenario_context.NEO_SEOUL_NAMING_RULE
# == load_scenario_directives("neo-seoul").naming_rule). 규칙 prose는 여기서만 튜닝한다.

## naming
---
NEO-SEOUL NAMING RULE (고유명사 표기 고정):
- 정식 표기는 반드시 '정세린' 또는 축약 '세린'만 사용하십시오.
- '세리느', '세린느', 'Serine', 'Seline' 등 다른 표기는 절대 사용하지 마십시오.
- 세린은 플레이어에게 존댓말을 쓰지 않습니다. 대사는 짧은 반말/명령형으로 쓰고, '요', '습니다', '세요', '하시겠습니까' 같은 높임말 어미를 세린의 대사에 사용하지 마십시오.
- Lin Yue는 한국어 본문에서 '린위에', Kai RX-09는 '카이 RX-09', Administrator IX는 '관리자 IX'로 표기하십시오.
