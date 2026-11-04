// Taxonomie des tâches — lib/tasks.ts
//
// Deux des trois règles testées ici correspondent à des bugs réels consignés
// dans CLAUDE.md : des noms de contacts qui atterrissaient dans le filtre par
// catégorie, et la ligne « Urgent » de /tasks qui restait à zéro quoi qu'il
// arrive parce que l'IA ne produit jamais `urgent` d'elle-même.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  isTaskCategory,
  resolveTaskCategory,
  resolveTaskPriority,
  resolveTaskDueDate,
} from '../lib/tasks.ts'

describe('resolveTaskCategory — jeu fermé, jamais de texte libre', () => {
  // Le bug d'origine : le nom de l'expéditeur finissait dans `category`, ce
  // qui faisait lister des contacts dans le filtre par catégorie. Il vit
  // maintenant dans `source_label`.
  test('un nom d’expéditeur ne devient jamais une catégorie', () => {
    const r = resolveTaskCategory('Marie Lavoisier', undefined)
    assert.ok(TASK_CATEGORIES.includes(r), `« ${r} » n’appartient pas au jeu fermé`)
    assert.equal(r, 'Autre')
  })

  test('n’importe quelle entrée rend toujours une catégorie valide', () => {
    const nImporteQuoi: unknown[] = [null, undefined, 42, '', '   ', {}, [], true, 'facture']
    for (const v of nImporteQuoi) {
      assert.ok(TASK_CATEGORIES.includes(resolveTaskCategory(v, undefined)))
    }
  })

  test('une catégorie valide proposée par l’IA est conservée', () => {
    const valide = TASK_CATEGORIES[0]
    assert.equal(resolveTaskCategory(valide, undefined), valide)
  })

  test('sans catégorie IA, le type d’email sert de repli déterministe', () => {
    const r = resolveTaskCategory(null, 'invoice')
    assert.ok(TASK_CATEGORIES.includes(r))
  })
})

describe('resolveTaskPriority — la priorité de l’EMAIL compte', () => {
  // Sans cette règle, /tasks n'affichait jamais la moindre tâche urgente :
  // l'IA ne produit pas `urgent` d'elle-même.
  test('un email urgent force une tâche urgente, même si l’IA dit « low »', () => {
    assert.equal(resolveTaskPriority('low', 'urgent'), 'urgent')
  })

  test('sans email urgent, la valeur de l’IA est respectée', () => {
    assert.equal(resolveTaskPriority('high', 'normal'), 'high')
  })

  test('n’importe quelle entrée rend toujours une priorité valide', () => {
    const nImporteQuoi: unknown[] = [null, undefined, 'URGENT', 'critique', 7, {}, '']
    for (const v of nImporteQuoi) {
      const r = resolveTaskPriority(v, undefined)
      assert.ok(TASK_PRIORITIES.includes(r), `« ${String(v)} » a produit « ${r} »`)
    }
  })
})

describe('resolveTaskDueDate', () => {
  const AUJOURDHUI = '2026-06-15'

  test('une échéance future est conservée', () => {
    assert.equal(resolveTaskDueDate('2026-06-20', AUJOURDHUI), '2026-06-20')
  })

  test('aujourd’hui est conservé — ce n’est pas en retard', () => {
    assert.equal(resolveTaskDueDate(AUJOURDHUI, AUJOURDHUI), AUJOURDHUI)
  })

  // Une tâche qui naît « En retard » parce que l'IA a daté depuis la réception
  // d'un vieil email est correcte dans l'absolu, et trompeuse dans une liste.
  test('une échéance passée est écartée plutôt que de naître en retard', () => {
    assert.equal(resolveTaskDueDate('2026-01-02', AUJOURDHUI), null)
  })

  test('une date inexistante est rejetée, pas décalée en silence', () => {
    // new Date('2026-02-31') glisse au 3 mars sans rien dire.
    assert.equal(resolveTaskDueDate('2026-02-31', AUJOURDHUI), null)
  })

  test('une entrée non conforme rend null', () => {
    for (const v of [null, undefined, 42, '20/06/2026', '2026-6-20', 'demain', {}]) {
      assert.equal(resolveTaskDueDate(v, AUJOURDHUI), null)
    }
  })
})

describe('isTaskCategory', () => {
  test('accepte exactement les membres du jeu fermé', () => {
    for (const c of TASK_CATEGORIES) assert.equal(isTaskCategory(c), true)
  })
  test('refuse tout le reste', () => {
    for (const v of ['autre', 'Client ', '', null, undefined, 0, {}]) {
      assert.equal(isTaskCategory(v), false)
    }
  })
})
