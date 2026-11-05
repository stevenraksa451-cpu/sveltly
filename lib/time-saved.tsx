// lib/time-saved.tsx
//
// Ce fichier ne contient plus QUE la note de méthode, parce qu'elle embarque
// <Brand /> et qu'un fichier avec du JSX n'est pas exécutable par le lanceur
// de tests de Node. Tout le calcul vit dans `lib/time-saved-calcul.ts` et est
// réexporté ici : les imports existants depuis `@/lib/time-saved` continuent
// de fonctionner sans changement.
//
// ⚠️ Ne pas renommer ce fichier en `.ts` et ne pas créer `lib/time-saved.ts` à
// côté : deux modules de même nom et d'extensions différentes rendent la
// résolution ambiguë, d'où le nom distinct du fichier de calcul.
import Brand from '@/components/ui/Brand'

export * from './time-saved-calcul'

export const TIME_SAVED_METHOD_NOTE = (
  <>
    Total depuis que <Brand /> suit votre boîte. Pour chaque action : le temps qu’elle prend à la main, moins celui qu’il reste avec <Brand />. Sont comptés le tri, le résumé, le brouillon de réponse, le rendez-vous posé, les événements déplacés pour lui faire place, la tâche créée et l’archivage — chacun seulement s’il a réellement eu lieu : un email trié sans résumé ne compte pas de résumé. Les newsletters, pubs et notifications ne comptent qu’un coup d’œil, sans gain de rédaction. Référence : étude McKinsey Global Institute.
  </>
)
