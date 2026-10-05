# NS-10: Search contributors by name

Contributor search is available in **Approve Contributions** and **Archive → Q&A**. It intentionally restores the search removed by FIX-9, as specified in the current timeline.

## Behavior

- Both fields match case-insensitive substrings of the contributor's stored real name. Leading and trailing search whitespace is ignored; an empty or whitespace-only search shows everyone in that view.
- Organizer searches find anonymous contributors by their real names. Relationship tags, public display names, statuses and answer text are not search targets.
- Changing or clearing the search returns to the first matching contributor. The clear button preserves input focus, and Escape clears the field. A result counter and specific no-match messages explain the current state.
- Approval searches include only submissions awaiting review. Pagination uses the filtered list and remains usable after a contributor is removed. Detail requests ignore stale responses so a slower request cannot show another contributor's answers under the current name.
- Archive content uses Photos, Voice, Stories and Q&A controls. Photos, recordings and stories remain pooled; Q&A displays one contributor's approved answers at a time, grouped by contributor ID so duplicate names stay separate. Contributors without approved Q&A are excluded from Q&A search. Recorded answers remain accessible.
- The archive endpoint already filters approval at the item level. The frontend now fetches it even when no contributor is fully approved, so approved Q&A from a partially reviewed submission is available. Search does not mutate content or approval state.

## Design reference

The Q&A controls, contributor header and answer cards follow [Figma frame 77:711](https://www.figma.com/design/AWRSCFqEjTHcSYmBuayGF6/Remember-Designs---Developer-Reference--Copy-?node-id=77-711), within the existing manage-page shell. Both search locations share the existing Lucide Search component, Remember tokens, Boska/Switzer fonts and a common contributor-navigation component. The navigation icons are local PNG exports of nodes 29:2521 and 29:2523, rendered at their original 25 × 50 dimensions. Figma's SVG references omitted the back instance's orientation; direct node exports preserve it.

## Verification

```sh
cd frontend
node --test tests/*.test.*
npm run lint -- --quiet
npm run build
```

48 frontend tests pass, including six NS-10 tests covering name matching, blank searches, anonymous identity, duplicate names, partial approval, audio-only answers and metadata fallback. ESLint and the normal Turbopack production build pass.

Browser checks used an isolated local API fixture and headless Chrome at 1440px and 390px widths, without modifying a live backend:

1. Search for a partial name with mixed case and surrounding whitespace in both views.
2. Verify two contributors named Sam Lee remain separate, and each contributor retains all their answers.
3. Search for an anonymous contributor's real name; their relationship tag must not match.
4. Enter an unmatched query, clear it with the button and Escape, and verify focus and the full result count.
5. Switch to Photos, Voice or Stories; Q&A search must not appear or filter pooled content.
6. Switch contributors while a detail request is delayed; the old response must not replace the current contributor's content.
7. Remove the last contributor in a three-person pending list; verify the remaining pager wraps correctly.
8. Confirm approved answers from a still-submitted contributor are searchable, and archive load errors offer a working retry.
9. Verify mobile Q&A has no horizontal overflow and both local navigation icons load at 25 × 50.

No schema migration or backend API change is required.
