spendingAlerts.js: Send alerts to users when they approach or exceed their budget limits.
fix acceptInvite: Add existing user to household
deleteLedgerEntry.js : delete a ledger Entry and it's connected bill/income/transaction
editLedgerEntry.js : edit a ledger Entry and it's connected bill/income/transaction
totalSpent.js: Show total spent since begining of the month till today's date
getTransactionsUpToToday.js: Show only transactions for the month upto today's date
getTotalMonthlyIncome.js : Show a total income for the current month.
pastDueBills.js: Show a list of bills in the ledger whose status is not true and who's date is past.
todayDueBills.js: Show a list of bills in the ledger whose status is not true and who's date is today.
todayDueBills.js: Show a list of bills in the ledger whose status is not true and who's date is today.
paidBills.js: Show a list of bills that are paid for the month who's status is true and is on the ledger.
exportBasedOnSearch.js: export a csv based on search criteria
> Basically, but it really has 2 purposes:


1. End of the year reporting: she'll need a way to export a category, but sum'ed by subcategory
2. Tracking throughout the year: in order to view the status and make sure she has all her records so far, she needs a way to display based on expense or income subcategory too - not necessarily an exportable

changePassword.js: a way to change password for a verified user that isn't just forgot password