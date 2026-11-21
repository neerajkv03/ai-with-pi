# Token usage — ai-with-pi

Sessions: `89e1af1f-63fb-440b-9ee2-348c57f66430`, `853211d0-f150-4946-aed3-19457ffd342a`, `99ca81ff-0580-4ef7-babe-f70f4cc92258`, `7c7df3ce-3a01-4977-9bef-113e47dafab0` · generated 2026-11-21
Source: Claude Code transcripts, API `usage` per assistant message (de-duplicated by message id). Main-session rows cover the whole conversation.
Input = uncached input · Cache write = prompt cached on that call · Cache read = cached prompt re-read (billed far lower) · Total = all four.
Weighted* = approx. cost in input-token units: input + 1.25×cache write + 0.1×cache read + 5×output (compare within one model; models differ in price).

## By model
| Model | Agents | Input | Cache write | Cache read | Output | Total | Weighted* |
|---|---:|---:|---:|---:|---:|---:|---:|
| opus 5.5 | 0 | 176 | 373,481 | 10,937,042 | 133,189 | 11,443,888 | 2,226,676 |
| sonnet 5.5 | 47 | 480 | 1,718,227 | 5,638,216 | 463,847 | 7,820,770 | 5,031,320 |
| haiku 5.5 | 22 | 248 | 819,866 | 2,364,871 | 293,454 | 3,478,439 | 2,728,838 |
| **All** | **69** | **904** | **2,911,574** | **18,940,129** | **890,490** | **22,743,097** | **9,986,834** |

## By phase
| Phase | Agents | Input | Cache write | Cache read | Output | Total | Weighted* |
|---|---:|---:|---:|---:|---:|---:|---:|
| Orchestrator (main session) | 0 | 140 | 300,667 | 9,418,708 | 114,031 | 9,833,546 | 1,887,999 |
| Phase 1 version | 2 | 62 | 196,913 | 2,115,396 | 29,154 | 2,341,525 | 603,513 |
| Phase 1 version-notes | 1 | 22 | 82,618 | 599,662 | 13,740 | 696,042 | 231,961 |
| Phase 3 content | 23 | 180 | 935,964 | 2,061,701 | 369,420 | 3,367,265 | 3,223,405 |
| Phase 5 accuracy | 8 | 94 | 503,133 | 1,729,988 | 48,531 | 2,281,746 | 1,044,663 |
| Phase 5 re-verify | 9 | 92 | 224,280 | 804,547 | 65,351 | 1,094,270 | 687,652 |
| Phase 5 fix | 22 | 288 | 350,709 | 2,084,088 | 70,207 | 2,505,292 | 998,118 |
| Phase 5 clarity | 4 | 26 | 317,290 | 126,039 | 180,056 | 623,411 | 1,309,523 |
| **All** | **69** | **904** | **2,911,574** | **18,940,129** | **890,490** | **22,743,097** | **9,986,834** |

## Per agent
| Phase | Task | Model | API calls | Input | Cache write | Cache read | Output | Total | Weighted* |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| Orchestrator (main session) | Planning + coordination | opus 5.5 | 54 | 110 | 224,804 | 8,379,040 | 104,111 | 8,708,065 | 1,639,574 |
| Phase 5 clarity | clarity 13–18 | haiku 5.5 | 3 | 6 | 89,988 | 28,237 | 53,800 | 172,031 | 384,315 |
| Phase 5 clarity | clarity 01–06 | haiku 5.5 | 4 | 8 | 78,670 | 41,175 | 51,717 | 171,570 | 361,048 |
| Phase 1 version | ai-with-pi (fetched 2026-11-21, official sources only) | opus 5.5 | 18 | 36 | 72,814 | 1,518,334 | 19,158 | 1,610,342 | 338,677 |
| Phase 5 clarity | clarity 07–12 | haiku 5.5 | 3 | 6 | 80,905 | 28,453 | 38,458 | 147,822 | 296,273 |
| Phase 5 clarity | clarity 19–23 | haiku 5.5 | 3 | 6 | 67,727 | 28,174 | 36,081 | 131,988 | 267,887 |
| Phase 3 content | 18-evaluation | sonnet 5.5 | 4 | 8 | 59,567 | 112,913 | 35,032 | 207,520 | 260,918 |
| Phase 1 version-notes | ai-with-pi | sonnet 5.5 | 11 | 22 | 82,618 | 599,662 | 13,740 | 696,042 | 231,961 |
| Phase 5 re-verify | clarity 01–06 | haiku 5.5 | 7 | 14 | 51,895 | 231,655 | 25,003 | 308,567 | 213,063 |
| Phase 3 content | 22-code-review-agent | sonnet 5.5 | 4 | 8 | 48,402 | 101,817 | 23,862 | 174,089 | 190,002 |
| Phase 3 content | 13-retrieval-skill | sonnet 5.5 | 4 | 8 | 45,791 | 98,740 | 21,653 | 166,192 | 175,386 |
| Phase 5 re-verify | clarity 19–23 | haiku 5.5 | 4 | 8 | 68,642 | 102,439 | 14,824 | 185,913 | 170,174 |
| Phase 1 version | ai-with-pi opencode provider | haiku 5.5 | 9 | 18 | 70,319 | 450,457 | 7,325 | 528,119 | 169,587 |
| Phase 3 content | 12-doc-index | sonnet 5.5 | 4 | 8 | 44,477 | 97,532 | 20,233 | 162,250 | 166,522 |
| Phase 3 content | 09-tool-design | sonnet 5.5 | 4 | 8 | 43,365 | 96,789 | 18,752 | 158,914 | 157,653 |
| Phase 3 content | 15-planning | sonnet 5.5 | 4 | 8 | 42,877 | 95,858 | 18,707 | 157,450 | 156,725 |
| Phase 5 accuracy | accuracy 13–15 | sonnet 5.5 | 7 | 14 | 68,532 | 315,534 | 7,213 | 391,293 | 153,297 |
| Phase 5 accuracy | accuracy 16–18 | sonnet 5.5 | 6 | 12 | 71,996 | 254,863 | 6,706 | 333,577 | 149,023 |
| Phase 3 content | 17-multi-step-recovery | sonnet 5.5 | 4 | 8 | 41,826 | 95,236 | 17,227 | 154,297 | 147,949 |
| Phase 5 accuracy | accuracy 01–03 | sonnet 5.5 | 7 | 14 | 65,638 | 275,406 | 6,426 | 347,484 | 141,732 |
| Phase 3 content | 11-embeddings | sonnet 5.5 | 5 | 10 | 39,569 | 137,446 | 15,397 | 192,422 | 140,201 |
| Phase 5 accuracy | accuracy 07–09 | sonnet 5.5 | 6 | 12 | 64,880 | 233,508 | 6,945 | 305,345 | 139,188 |
| Phase 3 content | 16-mcp-bridge | sonnet 5.5 | 4 | 8 | 40,445 | 94,050 | 15,651 | 150,154 | 138,224 |
| Phase 3 content | 02-typescript-essentials | sonnet 5.5 | 4 | 8 | 40,085 | 92,084 | 15,616 | 147,793 | 137,403 |
| Phase 3 content | 03-modules-async-node | sonnet 5.5 | 4 | 8 | 39,791 | 93,143 | 15,250 | 148,192 | 135,311 |
| Phase 3 content | 21-sdk-packages | sonnet 5.5 | 4 | 8 | 39,172 | 92,397 | 14,758 | 146,335 | 132,003 |
| Phase 3 content | 07-reading-traces | sonnet 5.5 | 4 | 8 | 39,195 | 92,548 | 14,653 | 146,404 | 131,522 |
| Phase 5 accuracy | accuracy 19–21 | sonnet 5.5 | 6 | 12 | 62,969 | 205,735 | 5,971 | 274,687 | 129,152 |
| Phase 3 content | 14-agent-memory | sonnet 5.5 | 4 | 8 | 38,074 | 90,892 | 14,067 | 143,041 | 127,025 |
| Orchestrator (main session) | Planning + coordination | opus 5.5 | 10 | 20 | 29,589 | 707,010 | 3,825 | 740,444 | 126,832 |
| Phase 3 content | 19-guardrails | sonnet 5.5 | 3 | 6 | 38,965 | 47,597 | 14,325 | 100,893 | 125,097 |
| Phase 5 accuracy | accuracy 04–06 | sonnet 5.5 | 6 | 12 | 59,180 | 217,842 | 5,470 | 282,504 | 123,121 |
| Phase 3 content | 06-agent-loop | sonnet 5.5 | 4 | 8 | 37,458 | 90,458 | 13,269 | 141,193 | 122,221 |
| Orchestrator (main session) | Planning + coordination | opus 5.5 | 5 | 10 | 46,274 | 332,658 | 6,095 | 385,037 | 121,593 |
| Phase 3 content | 05-prompts-messages | sonnet 5.5 | 3 | 6 | 37,500 | 47,280 | 13,181 | 97,967 | 117,514 |
| Phase 3 content | 08-first-extension | sonnet 5.5 | 4 | 8 | 36,456 | 89,894 | 11,829 | 138,187 | 113,712 |
| Phase 3 content | 20-cost-control | sonnet 5.5 | 4 | 8 | 36,077 | 89,026 | 11,939 | 137,050 | 113,702 |
| Phase 3 content | 10-commands-events-templates | sonnet 5.5 | 4 | 8 | 35,809 | 88,829 | 11,600 | 136,246 | 111,652 |
| Phase 3 content | 01-terminal-setup | sonnet 5.5 | 3 | 6 | 41,294 | 41,656 | 10,775 | 93,731 | 109,664 |
| Phase 5 re-verify | clarity 13–18 | haiku 5.5 | 7 | 14 | 25,912 | 134,744 | 12,643 | 173,313 | 109,093 |
| Phase 3 content | 23-shipping | sonnet 5.5 | 4 | 8 | 34,757 | 87,258 | 11,067 | 133,090 | 107,515 |
| Phase 5 accuracy | accuracy 22–23 | sonnet 5.5 | 5 | 10 | 52,466 | 142,346 | 5,491 | 200,313 | 107,282 |
| Phase 3 content | 04-llm-fundamentals | sonnet 5.5 | 4 | 8 | 35,012 | 88,258 | 10,577 | 133,855 | 105,484 |
| Phase 5 accuracy | accuracy 10–12 | sonnet 5.5 | 4 | 8 | 57,472 | 84,754 | 4,309 | 146,543 | 101,868 |
| Phase 1 version | ai-with-pi | haiku 5.5 | 4 | 8 | 53,780 | 146,605 | 2,671 | 203,064 | 95,249 |
| Phase 5 fix | 16-mcp-bridge r1 | haiku 5.5 | 7 | 14 | 30,563 | 126,999 | 8,041 | 165,617 | 91,123 |
| Phase 5 fix | 22-code-review-agent r1 | haiku 5.5 | 8 | 16 | 28,978 | 157,917 | 4,695 | 191,606 | 75,505 |
| Phase 5 fix | 02-typescript-essentials r1 | haiku 5.5 | 5 | 10 | 26,196 | 90,218 | 5,994 | 122,418 | 71,747 |
| Phase 5 re-verify | clarity 07–12 | haiku 5.5 | 4 | 8 | 21,224 | 55,537 | 6,831 | 83,600 | 66,247 |
| Phase 5 fix | 07-reading-traces r1 | haiku 5.5 | 8 | 16 | 21,092 | 109,902 | 4,713 | 135,723 | 60,936 |
| Phase 5 fix | 19-guardrails r1 | sonnet 5.5 | 11 | 22 | 15,814 | 184,017 | 4,275 | 204,128 | 59,566 |
| Phase 5 fix | 05-prompts-messages r1 | sonnet 5.5 | 11 | 22 | 14,433 | 170,899 | 3,846 | 189,200 | 54,383 |
| Phase 5 fix | 03-modules-async-node r1 | sonnet 5.5 | 5 | 10 | 20,388 | 79,771 | 3,449 | 103,618 | 50,717 |
| Phase 5 fix | 12-doc-index r1 | haiku 5.5 | 8 | 16 | 14,976 | 115,414 | 3,839 | 134,245 | 49,472 |
| Phase 5 fix | 20-cost-control r1 | haiku 5.5 | 4 | 8 | 16,172 | 48,876 | 4,230 | 69,286 | 46,261 |
| Phase 5 fix | 06-agent-loop r1 | sonnet 5.5 | 6 | 12 | 16,198 | 90,007 | 2,916 | 109,133 | 43,840 |
| Phase 5 fix | 04-llm-fundamentals r1 | haiku 5.5 | 6 | 12 | 14,192 | 85,470 | 3,231 | 102,905 | 42,454 |
| Phase 5 fix | 09-tool-design r1 | sonnet 5.5 | 7 | 14 | 17,360 | 87,943 | 2,366 | 107,683 | 42,338 |
| Phase 5 fix | 17-multi-step-recovery r1 | sonnet 5.5 | 7 | 14 | 12,270 | 94,591 | 2,797 | 109,672 | 38,796 |
| Phase 5 fix | 14-agent-memory r1 | haiku 5.5 | 8 | 16 | 11,020 | 103,023 | 2,454 | 116,513 | 36,363 |
| Phase 5 fix | 21-sdk-packages r1 | haiku 5.5 | 6 | 12 | 12,240 | 78,447 | 2,578 | 93,277 | 36,047 |
| Phase 5 fix | 01-terminal-setup r1 | sonnet 5.5 | 7 | 14 | 11,371 | 91,273 | 2,182 | 104,840 | 34,265 |
| Phase 5 re-verify | accuracy 01–05 | sonnet 5.5 | 6 | 12 | 13,175 | 81,170 | 1,687 | 96,044 | 33,033 |
| Phase 5 fix | 15-planning r1 | haiku 5.5 | 5 | 10 | 15,000 | 68,428 | 1,254 | 84,692 | 31,873 |
| Phase 5 re-verify | accuracy 13–17 | sonnet 5.5 | 6 | 12 | 12,481 | 76,376 | 1,639 | 90,508 | 31,446 |
| Phase 5 fix | 11-embeddings r1 | sonnet 5.5 | 5 | 10 | 12,095 | 63,471 | 1,973 | 77,549 | 31,341 |
| Phase 5 fix | 08-first-extension r1 | haiku 5.5 | 6 | 12 | 10,737 | 74,678 | 1,673 | 87,100 | 29,266 |
| Phase 5 fix | 18-evaluation r1 | haiku 5.5 | 5 | 10 | 9,638 | 58,023 | 1,399 | 69,070 | 24,855 |
| Phase 5 fix | 13-retrieval-skill r1 | sonnet 5.5 | 5 | 10 | 9,774 | 59,197 | 1,234 | 70,215 | 24,317 |
| Phase 5 fix | 23-shipping r1 | sonnet 5.5 | 4 | 8 | 10,202 | 45,524 | 1,068 | 56,802 | 22,653 |
| Phase 5 re-verify | accuracy 06-agent-loop | sonnet 5.5 | 5 | 10 | 9,243 | 51,720 | 1,013 | 61,986 | 21,801 |
| Phase 5 re-verify | accuracy 09–11 | sonnet 5.5 | 4 | 8 | 9,661 | 40,546 | 1,129 | 51,344 | 21,784 |
| Phase 5 re-verify | accuracy 19–23 | sonnet 5.5 | 3 | 6 | 12,047 | 30,360 | 582 | 42,995 | 21,011 |

## Notes
- Subagents: 69, 11,299,209 tokens (weighted 7,760,158). Main session: 11,443,888 tokens (weighted 2,226,676), 95.6% cache reads.
- Dollar cost not computed; run `/cost` in Claude Code.
