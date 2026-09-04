// Заблокированный сотрудник (пользователь: "если заблокирован то данные о
// нём тока у Админа, у других должно быть тока заблокирован") — админ
// по-прежнему видит настоящее имя (с пометкой), остальным вместо имени
// показывается только сам факт блокировки, без какой-либо другой информации.
// Используется везде, где в Регламентах/Проектах/Блоге показывается имя
// автора/исполнителя/отправителя (RegulationEntry/Reply, ProjectChatMessage/
// Reply, BlogTopic/Comment).
export function employeeDisplayName(name: string, isBlocked: boolean, viewerIsAdmin: boolean, blockedLabel: string): string {
  if (!isBlocked) return name;
  return viewerIsAdmin ? `${name} (${blockedLabel})` : blockedLabel;
}
