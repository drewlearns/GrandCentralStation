Table User {
  uuid String [pk]
  username String
  firstName String
  lastName String
  email String
  phoneNumber String
  signupDate DateTime
  mailOptIn Boolean
  defaultFamilyId String [ref: > Family.familyId]
  createdAt DateTime
  updatedAt DateTime
  confirmedEmail Boolean
}

Table Family {
  familyId String [pk]
  familyName String
  creationDate DateTime
  customFamilyNameSuchAsCrew String
  createdAt DateTime
  updatedAt DateTime
  account String
  setupComplete Boolean
  activeSubscription Boolean
}

Table FamilyMembers {
  familyId String [pk, ref: > Family.familyId]
  memberUuid String [ref: > User.uuid]
  role String
  joinedDate DateTime
  createdAt DateTime
  updatedAt DateTime
}

Table Incomes {
  incomeId String [pk]
  familyId String [ref: > Family.familyId]
  name String
  amount Int
  frequency String
  firstPayDay String
}

Table TransactionLedger {
  transactionId String [pk]
  familyId String [ref: > Family.familyId]
  amount Float
  transactionType String
  transactionDate DateTime
  category String
  description String
  createdAt DateTime
  updatedAt DateTime
  updatedBy String
}

Table Calendar {
  dateId Int [pk]
  familyId String [ref: > Family.familyId]
  eventName String
  eventDate DateTime
  transactionId String [ref: > TransactionLedger.transactionId]
  billId String [ref: > BillTable.billId]
  description String
  createdAt DateTime
  updatedAt DateTime
}

Table BillTable {
  billId String [pk]
  familyId String [ref: > Family.familyId]
  category String
  billName String
  amount Float
  dayOfMonth Int
  frequency String
  isDebt Boolean
  interestRate Float
  totalDebt Int
  description String
  status String
  url String
  username String
  password String
  createdAt DateTime
  updatedAt DateTime
}

Table Preferences {
  preferenceId String [pk]
  familyId String [ref: > Family.familyId]
  preferenceType String
  preferenceValue String
  createdAt DateTime
  updatedAt DateTime
}

Table Invitations {
  invitationId String [pk]
  familyId String [ref: > Family.familyId]
  invitedUserUuid String [ref: > User.uuid]
  invitationStatus String
  sentDate DateTime
  createdAt DateTime
  updatedAt DateTime
}

Table AuditTrail {
  auditId String [pk]
  tableAffected String
  actionType String
  oldValue String
  newValue String
  changedBy String [ref: > User.uuid]
  changeDate DateTime
  timestamp DateTime
  device String
  ipAddress String
  deviceType String
  ssoEnabled String
}

Table Attachments {
  attachmentId String [pk]
  transactionId String [ref: > TransactionLedger.transactionId]
  fileType String
  filePath String
  uploadDate DateTime
  createdAt DateTime
  updatedAt DateTime
}

Table Categories {
  category_id String [pk]
  familyId String [ref: > Family.familyId]
  name String
  budgetLimit Int
  createdAt DateTime
  updatedAt DateTime
}

Table SecurityLog {
  logId String [pk]
  userUuid String [ref: > User.uuid]
  loginTime DateTime
  ipAddress String
  deviceDetails String
  locationDetails String
  actionType String
  createdAt DateTime
}

Table Notification {
  notificationId String [pk]
  userUuid String [ref: > User.uuid]
  title String
  message String
  read Boolean
  createdAt DateTime
  updatedAt DateTime
}
