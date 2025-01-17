
# TPPB



<!--- If we have only one group/collection, then no need for the "ungrouped" heading -->



## Endpoints

* [Bills](#bills)
    1. [addBill](#1-addbill)
    1. [deleteBill](#2-deletebill)
    1. [editBill](#3-editbill)
    1. [getBillPassword](#4-getbillpassword)
    1. [getBills](#5-getbills)
    1. [getFilePath](#6-getfilepath)
* [Household](#household)
    1. [acceptInvite](#1-acceptinvite)
    1. [addHousehold](#2-addhousehold)
    1. [addInvite](#3-addinvite)
    1. [deleteHousehold](#4-deletehousehold)
    1. [deleteMemberFromHousehold](#5-deletememberfromhousehold)
    1. [editHousehold](#6-edithousehold)
    1. [getHousehold](#7-gethousehold)
    1. [getHouseholdById](#8-gethouseholdbyid)
    1. [getHouseholdMembers](#9-gethouseholdmembers)
* [Income](#income)
    1. [addIncome](#1-addincome)
    1. [deleteIncome.js](#2-deleteincomejs)
    1. [editIncome.js](#3-editincomejs)
    1. [getIncome](#4-getincome)
    1. [getIncomes](#5-getincomes)
* [Notifications](#notifications)
    1. [addNotification](#1-addnotification)
    1. [deleteNotification](#2-deletenotification)
    1. [editNotification](#3-editnotification)
    1. [getNotifications](#4-getnotifications)
* [PaymentSource](#paymentsource)
    1. [addPaymentSource](#1-addpaymentsource)
    1. [deletePaymentSource](#2-deletepaymentsource)
    1. [editPaymentSource](#3-editpaymentsource)
    1. [getPaymentSource](#4-getpaymentsource)
* [Preferences](#preferences)
    1. [editCurrencyPreference](#1-editcurrencypreference)
    1. [editDefaultPaymentSource](#2-editdefaultpaymentsource)
    1. [editThreshold](#3-editthreshold)
    1. [getCurrencyPreference](#4-getcurrencypreference)
    1. [getDefaultPaymentSourcePreference](#5-getdefaultpaymentsourcepreference)
    1. [getThresholdBreakers](#6-getthresholdbreakers)
    1. [getThresholdPreference](#7-getthresholdpreference)
    1. [setCurrencyPreference](#8-setcurrencypreference)
    1. [setDefaultPaymentSource](#9-setdefaultpaymentsource)
    1. [setThreshold](#10-setthreshold)
* [Reporting](#reporting)
    1. [exportLedgerToCsv](#1-exportledgertocsv)
    1. [exportLedgerToQBO](#2-exportledgertoqbo)
    1. [getCategories](#3-getcategories)
    1. [getLedger](#4-getledger)
    1. [getRunningTotal](#5-getrunningtotal)
    1. [getRunningTotalsByDate](#6-getrunningtotalsbydate)
* [Security](#security)
    1. [getAuditTrail](#1-getaudittrail)
    1. [getSecurityLog](#2-getsecuritylog)
* [Transactions](#transactions)
    1. [addTransaction](#1-addtransaction)
    1. [editTransaction](#2-edittransaction)
    1. [getFilePath](#3-getfilepath)
    1. [getTransaction](#4-gettransaction)
    1. [getTransactionByMonth](#5-gettransactionbymonth)
    1. [getTransactionsByPaymentSource](#6-gettransactionsbypaymentsource)
    1. [searchTransactions](#7-searchtransactions)
* [User](#user)
    1. [addUser](#1-adduser)
    1. [confirmPasswordResetCode](#2-confirmpasswordresetcode)
    1. [confirmSignup](#3-confirmsignup)
    1. [deleteUser.js](#4-deleteuserjs)
    1. [editUser](#5-edituser)
    1. [forgotPassword](#6-forgotpassword)
    1. [getUser](#7-getuser)
    1. [login](#8-login)
    1. [refreshToken](#9-refreshtoken)
    1. [revokeToken](#10-revoketoken)

--------



## Bills



### 1. addBill


This endpoint allows you to add a new bill to the system. The request should be sent via an HTTP POST method to `api.dev.thepurplepiggybank.com/addBill`.

### Request Body

- `authorizationToken` (string): The authorization token for the request.

- `householdId` (string): The ID of the household to which the bill belongs.

- `category` (string): The category of the bill.

- `billName` (string): The name of the bill.

- `amount` (string): The amount of the bill.

- `dayOfMonth` (string): The day of the month on which the bill is due.

- `frequency` (string): The frequency of the bill (e.g., monthly, yearly).

- `isDebt` (boolean): Indicates whether the bill is a debt or not.

- `interestRate` (null): The interest rate for the bill, if applicable.

- `cashBack` (null): The cashback amount, if applicable.

- `description` (string): Description of the bill.

- `status` (string): The status of the bill.

- `url` (string): The URL related to the bill.

- `username` (string): The username for the bill, if applicable.

- `password` (string): The password for the bill, if applicable.

- `ipAddress` (string): The IP address related to the bill.

- `deviceDetails` (string): Details of the device related to the bill.

- `paymentSourceId` (string): The ID of the payment source for the bill.


### Response

The response will contain the status of the request, along with any relevant information or error messages.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/addBill
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImJlNWQxN2NhLTZkODctNDZjOC1hMjZmLWJkMDI1NDMxNzlhOCIsImV2ZW50X2lkIjoiNWIyMTU3ZjYtYTExMi00ZjI4LTk1MDgtN2JmODllNTAwYzYzIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQwNDE1OCwiZXhwIjoxNzE2NDA3NzU4LCJpYXQiOjE3MTY0MDQxNTgsImp0aSI6IjIzZWVkMWY3LThjNTktNGE1Ny1iY2VhLTY4M2ZkZWY1OWYxNSIsInVzZXJuYW1lIjoidGVzdCJ9.H0FVxhy14Le1Cdw4HtfBkXzk0AHq_rM2hNoeXvLAkb9fk4ommoHOKoDtEjTnzz3sl9TRY3d7VcA2dA0ygvN-BL5GpK8V0pVXn4DdNQGlR6OHVYz95vwO19j_Sm2lkRj7ihUAek3h145EA3AHj6EIoil01wQOVsDYTol2Xh4nkq9J73iqdu3DBadJq4kkGVv3hPYp8-2qGM96GWMgl3hojJy3Lx9dGqaqIB-78APg3rHQ2rD6G5NOQQXTwMtC5zc0t5J_N8EbASTT9s95wS1Hv_gGSgo4aFx6lm2TNsj7hb8xCAg19-5Hz3wUNcNIgBYHYclUdDi-t9c5SdNrJR2pYQ",
    "householdId": "f109960f-b082-44d7-bd86-0a85f3fe24a0",
    "category": "Test",
    "billName": "test Bill",
    "amount": "0.01",
    "dayOfMonth": "15",
    "frequency": "monthly",
    "isDebt": "false",
    "interestRate": null,
    "cashBack": null,
    "description": "Monthly electricity bill",
    "status": "true",
    "url": "https://utilitycompany.com/pay",
    "username": "user123",
    "password": "securepassword",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "iPhone 12, iOS 14.4",
    "paymentSourceId": "a9c4744a-b9f0-4c23-b7ea-17225516b520"
}
```



### 2. deleteBill


### Delete Bill

The `deleteBill` endpoint is a POST request that is used to delete a bill from The Purple Piggy Bank platform.

#### Request Body

- `authorizationToken` (string): The authorization token for the request.

- `billId` (string): The ID of the bill to be deleted.

- `ipAddress` (string): The IP address of the device making the request.

- `deviceDetails` (string): Details of the device making the request.


#### Response

The response of this request follows the JSON schema below:

``` json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string"
    },
    "message": {
      "type": "string"
    }
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/deleteBill
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDQ4YjQ5OC1lMGYxLTcwNjUtNjBhMC1iNGIyZGQzMTdkODEiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImFkMWM2NjBmLTJjMTMtNDI3Yi05OTBkLWYyOTQ4ODFhYjU0ZiIsImV2ZW50X2lkIjoiMDA1NmUxYzUtYTBkYS00ZTU4LWIwMzgtM2NhNGJkN2RlNWU3IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjE1MzE3NywiZXhwIjoxNzE2MTU2Nzc3LCJpYXQiOjE3MTYxNTMxNzcsImp0aSI6IjJjODExOTEwLTQ1ZTktNGQ2Zi04NTQ4LTMyOTEyZTg2ZTg1MyIsInVzZXJuYW1lIjoidGVzdCJ9.ojK-PmmolribnK32xgJ1yNCCcTTq97sw9Lnqnt_hLWu1X80Tkgr58UUU0w3OnZCTXedRyIpmDZrS8E74bjCRWzFkP1fEsY0TdfD4fT3RxI4XXNdV3FZlPn3qT4EiENjuondzDO4PkxoDK717GzAgVza95aBJnyQHDl35EM11yKqlHRr0TiVJ9QrsrF5h-zxwXu7HTr3laDZ3QQ-mEcPrXsSJp5aJGG7kMWKwGKbyZKB5IqWuBbZRzeY84YQ3YtI8JECuLeZZ6u6nmtJZBOHvX3ac4yKupRXdvoH2Ryyin9TzOMkORBzeOIKa40AnTe0w8vAaTnWy5R4Edfbqy1SpHQ",
    "billId": "367e3486-8429-47d1-b3dd-631a22350b66",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
```



### 3. editBill


This HTTP POST request is used to edit a bill on thepurplepiggybank.com. The request should include an authorization token, bill ID, updates to the bill details such as category, bill name, amount, day of month, frequency, debt status, interest rate, cash back, description, status, URL, username, password, and notification ID, as well as the user's IP address and device details.

### Response

The response of this request is a JSON schema representing the structure of the data returned after editing the bill. The schema will define the properties and their data types that can be expected in the response.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/editBill
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjNhNDNmZDcwLWUwNGItNDgxZS1iZjhjLWFjYmYyMzUwMDdmZiIsImV2ZW50X2lkIjoiYTRmNGUxMGItNWYwZS00NzYzLThmM2YtMTM0YzVhNzU3YzJmIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQwODA1OSwiZXhwIjoxNzE2NDExNjU5LCJpYXQiOjE3MTY0MDgwNTksImp0aSI6ImVjNDg1YTQ5LTZjMGItNGQ3OS04YWZkLTkzYjhmMWM5ZWUzYiIsInVzZXJuYW1lIjoidGVzdCJ9.MMwur4DlEBJK1-CjLLirb-uc1-W1_SklGmEf3C22Q5XL4w8VfRZ122xIZfMCTHIkzbeFZ9UMX7SzV1wSQev8VoaAaoe0tTGMWqPp3AUUs1oaAulH9-ZC9UJ-8ap_mC_Ny1gohZYd5JkOqu-VMY8VKHIikbhIiZSJ54UMh3pbKOveLJZJGIUYMfscvFWu4BA0HQJhw3GalbhXrA3U7Zx4I7UvniqNTA3f7kfG-ECCkZLTacP1q4VXcXmKmPQCfQ8R3JUa_ALZ5mpHswiBkif4Sp8i_1o8jHlPQYB7zCUQlmHMEf--qUr0clieFahKmrpkFfMR_TAq_5g1b01l0gQRgQ",
    "billId": "8af9dad4-dbf2-4ad4-90f6-ae702dddb445",
    "updates": {
        "category": "New Category",
        "billName": "Updated Bill Name",
        "amount": 150.75,
        "dayOfMonth": 16,
        "frequency": "monthly",
        "isDebt": "false",
        "interestRate": 3.5,
        "cashBack": 1.5,
        "description": "Updated description",
        "status": "active",
        "url": "https://new.url",
        "username": "newUsername",
        "password": "newPassword",
        "notificationId": "1df5b635-3cf7-46fc-90b7-c69e547b0e5a"
    },
    "ipAddress": "YOUR_IP_ADDRESS",
    "deviceDetails": "YOUR_DEVICE_DETAILS"
}
```



### 4. getBillPassword



The `POST` request to `/getBillPassword` endpoint is used to retrieve the password for a bill. The request should be sent to `api.dev.thepurplepiggybank.com`. The request body should contain the following parameters:

- `authorizationToken` (string): The authorization token for accessing the bill password.
- `billId` (string): The unique identifier of the bill for which the password is being retrieved.
- `ipAddress` (string): The IP address of the device from which the request is being made.
- `deviceDetails` (string): Details of the device from which the request is being made.

### Response
The response to this request will be a JSON object with the following schema:

```json
{
  "password": "string"
}
```
- `password` (string): The password for accessing the bill.



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getBillPassword
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImJlNWQxN2NhLTZkODctNDZjOC1hMjZmLWJkMDI1NDMxNzlhOCIsImV2ZW50X2lkIjoiNWIyMTU3ZjYtYTExMi00ZjI4LTk1MDgtN2JmODllNTAwYzYzIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQwNDE1OCwiZXhwIjoxNzE2NDA3NzU4LCJpYXQiOjE3MTY0MDQxNTgsImp0aSI6IjIzZWVkMWY3LThjNTktNGE1Ny1iY2VhLTY4M2ZkZWY1OWYxNSIsInVzZXJuYW1lIjoidGVzdCJ9.H0FVxhy14Le1Cdw4HtfBkXzk0AHq_rM2hNoeXvLAkb9fk4ommoHOKoDtEjTnzz3sl9TRY3d7VcA2dA0ygvN-BL5GpK8V0pVXn4DdNQGlR6OHVYz95vwO19j_Sm2lkRj7ihUAek3h145EA3AHj6EIoil01wQOVsDYTol2Xh4nkq9J73iqdu3DBadJq4kkGVv3hPYp8-2qGM96GWMgl3hojJy3Lx9dGqaqIB-78APg3rHQ2rD6G5NOQQXTwMtC5zc0t5J_N8EbASTT9s95wS1Hv_gGSgo4aFx6lm2TNsj7hb8xCAg19-5Hz3wUNcNIgBYHYclUdDi-t9c5SdNrJR2pYQ",
    "billId": "4a541bfe-b87b-44c7-9291-0817502e9726",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
```



### 5. getBills



### Get Bills

This endpoint is used to retrieve bills for a specific household.

#### Request

The request should be sent as an HTTP POST to `api.dev.thepurplepiggybank.com/getBills`.

##### Request Body

The request body should be sent in JSON format and include the following parameters:

- `authorizationToken` (string, required): The authorization token for the request.
- `householdId` (string, required): The ID of the household for which bills are being retrieved.
- `ipAddress` (string, required): The IP address of the device making the request.
- `deviceDetails` (string, required): Details of the device making the request.

#### Response

The response to this request will be a JSON object with the schema as follows:

```json
{
  "type": "object",
  "properties": {
    "bills": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          // Properties of each bill item
        }
      }
    }
  }
}
```

The response will contain an array of bills specific to the household ID provided in the request.



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getBills
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjNhNDNmZDcwLWUwNGItNDgxZS1iZjhjLWFjYmYyMzUwMDdmZiIsImV2ZW50X2lkIjoiYTRmNGUxMGItNWYwZS00NzYzLThmM2YtMTM0YzVhNzU3YzJmIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQwODA1OSwiZXhwIjoxNzE2NDExNjU5LCJpYXQiOjE3MTY0MDgwNTksImp0aSI6ImVjNDg1YTQ5LTZjMGItNGQ3OS04YWZkLTkzYjhmMWM5ZWUzYiIsInVzZXJuYW1lIjoidGVzdCJ9.MMwur4DlEBJK1-CjLLirb-uc1-W1_SklGmEf3C22Q5XL4w8VfRZ122xIZfMCTHIkzbeFZ9UMX7SzV1wSQev8VoaAaoe0tTGMWqPp3AUUs1oaAulH9-ZC9UJ-8ap_mC_Ny1gohZYd5JkOqu-VMY8VKHIikbhIiZSJ54UMh3pbKOveLJZJGIUYMfscvFWu4BA0HQJhw3GalbhXrA3U7Zx4I7UvniqNTA3f7kfG-ECCkZLTacP1q4VXcXmKmPQCfQ8R3JUa_ALZ5mpHswiBkif4Sp8i_1o8jHlPQYB7zCUQlmHMEf--qUr0clieFahKmrpkFfMR_TAq_5g1b01l0gQRgQ",
    "householdId": "f109960f-b082-44d7-bd86-0a85f3fe24a0",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
```



### 6. getFilePath


### Get File Path

This endpoint is used to retrieve the file path by providing the authorization token and transaction ID.

#### Request Body

- `authorizationToken` (string, required): The authorization token for authentication.

- `transactionId` (string, required): The ID of the transaction.


#### Response

The response will contain the file path for the provided transaction ID.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getFilePath
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDQ4YjQ5OC1lMGYxLTcwNjUtNjBhMC1iNGIyZGQzMTdkODEiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjI3ZWYxNTgzLTgzYmItNDg1NS1iN2ZiLWNiMGVhZjIyYWM1YSIsImV2ZW50X2lkIjoiNDFkNjQ3YzctZjRiYy00ZThhLTkwMmEtMjRhYWM0Y2I2MmM5IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjE0MTcxNCwiZXhwIjoxNzE2MTQ1MzE0LCJpYXQiOjE3MTYxNDE3MTQsImp0aSI6IjQxYWY0Y2NiLWM2ODQtNDdhYS1iZWYyLWI2NTI2OWEwOTVkZSIsInVzZXJuYW1lIjoidGVzdCJ9.sW-zQyqT_J1wYS70IlFryFF3xhNx3Ik1K7DnV6QNfGa4GXGx6TTG7YX-vm4TrHgGftL6fFgk0JySuFUZ3wnHrjj8oN2YM9DC5qxwI46lhWfJWAE-w5PJmcxjL107FpaOEpTz3xj1tga_bpmMtxY5qt3-PyDZEjYKCh6A1jlGMDDPUGJkY3CR7Oet5E6Ho37OS-I9Nh8cYQ4CSzY4Bb6O38D1kegHPXK3WR_KCHGGFmo2b3A9K2zw15-HhF4Ea_QkpNmNeY8SY8b7CzYpxoz8d0xYghCvo3qVgrIHFAIhievOFfP8CvmpgLub3pw_YZkEq4iL8TouZe2PP8Wk5xXz5Q",
      "transactionId": "example-transaction-id"
}

```



## Household



### 1. acceptInvite


The `POST` request to `/acceptInvite` endpoint is used to accept an invitation. The request should include the `invitationId`, `ipAddress`, `deviceDetails`, `username`, `mailOptin`, `firstName`, `lastName`, `phoneNumber`, and `password` in the payload.

### Response

The response for this request is a JSON object with the following schema:

``` json
{
    "message": "Invitation accepted successfully",
    "householdMember": {
        "id": "49d9881e-7c94-49b9-8375-69d56a30868b",
        "householdId": "5849cc41-7e74-42df-a2da-5689ca44cde3",
        "memberUuid": "test-accepted-user",
        "role": "Member",
        "joinedDate": "2024-05-21T23:11:50.947Z",
        "createdAt": "2024-05-21T23:11:50.947Z",
        "updatedAt": "2024-05-21T23:11:50.947Z"
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/acceptInvite
```



***Body:***

```js
{
    "invitationId": "81edd8aa-996f-4063-9b44-2a6e06d66035",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "username": "test22",
    "mailOptin": true,
    "firstName": "test",
    "lastName": "mcTesty",
    "phoneNumber": "+1231231234",
    "password": "SuperSecurePassword123%"
}

```



### 2. addHousehold


### Add Household

The `addHousehold` endpoint is used to add a new household.

#### Request Body

- `householdName` (string, required): The name of the household.
- `authorizationToken` (string, required): The authorization token for authentication.
- `customHouseholdNameSuchAsCrew` (string, required): A custom name for the household.
- `account` (string, required): The account information.
- `ipAddress` (string, required): The IP address of the device.
- `deviceDetails` (string, required): Details of the device.


#### Response (JSON Schema)

``` json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        },
        "householdId": {
            "type": "string"
        },
        "householdName": {
            "type": "string"
        },
        "customHouseholdName": {
            "type": "string"
        },
        "account": {
            "type": "string"
        }
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/addHousehold
```



***Body:***

```js
{
    "householdName": "karriker",
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImJlNWQxN2NhLTZkODctNDZjOC1hMjZmLWJkMDI1NDMxNzlhOCIsImV2ZW50X2lkIjoiNWIyMTU3ZjYtYTExMi00ZjI4LTk1MDgtN2JmODllNTAwYzYzIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQwNDE1OCwiZXhwIjoxNzE2NDA3NzU4LCJpYXQiOjE3MTY0MDQxNTgsImp0aSI6IjIzZWVkMWY3LThjNTktNGE1Ny1iY2VhLTY4M2ZkZWY1OWYxNSIsInVzZXJuYW1lIjoidGVzdCJ9.H0FVxhy14Le1Cdw4HtfBkXzk0AHq_rM2hNoeXvLAkb9fk4ommoHOKoDtEjTnzz3sl9TRY3d7VcA2dA0ygvN-BL5GpK8V0pVXn4DdNQGlR6OHVYz95vwO19j_Sm2lkRj7ihUAek3h145EA3AHj6EIoil01wQOVsDYTol2Xh4nkq9J73iqdu3DBadJq4kkGVv3hPYp8-2qGM96GWMgl3hojJy3Lx9dGqaqIB-78APg3rHQ2rD6G5NOQQXTwMtC5zc0t5J_N8EbASTT9s95wS1Hv_gGSgo4aFx6lm2TNsj7hb8xCAg19-5Hz3wUNcNIgBYHYclUdDi-t9c5SdNrJR2pYQ",
    "customHouseholdNameSuchAsCrew": "karriker crew",
    "account": "standard",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
```



### 3. addInvite


The `POST /addInvite` endpoint is used to send an invitation to a user to join a household. The request should include the `householdId`, `invitedUserEmail`, `authorizationToken`, `role`, `ipAddress`, and `deviceDetails` in the request body.

### Response

The response will have a status code of 500 and a JSON body with the following schema:

``` json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        },
        "error": {
            "type": "string"
        }
    }
}

 ```

This JSON schema represents the structure of the response object returned by the API.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/addInvite
```



***Body:***

```js
{
    "householdId": "household-uuid-123",
    "invitedUserEmail": "inviteduser@example.com",
    "invitingUserUuid": "user-uuid-789",
    "role": "Member",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

```



### 4. deleteHousehold



The `POST` request to `/deleteHousehold` endpoint is used to delete a household.

### Request Body
- `householdId` (string): The ID of the household to be deleted.
- `authorizationToken` (string): The authorization token for authentication.
- `ipAddress` (string): The IP address of the device making the request.
- `deviceDetails` (string): Details of the device making the request.

### Response
The response is a JSON object with the following properties:
- `message` (string): A message indicating the result of the deletion operation.
- `householdId` (string): The ID of the deleted household.

### JSON Schema
```json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        },
        "householdId": {
            "type": "string"
        }
    }
}



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/deleteHousehold
```



***Body:***

```js
{
    "householdId": "5849cc41-7e74-42df-a2da-5689ca44cde3",
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmNDc4ZjQwOC0wMDYxLTcwYjctMDkyNC1kODI1ZmU4YWEwYTUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImZmNTNiOGRlLTljZmQtNDdkYi1iNjEzLTkyMTIzNzc0M2IzOSIsImV2ZW50X2lkIjoiNzc3NjZmYzUtOGUwNC00NjVlLWE5ZTYtNzc4ODZlNGUxOTZlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjMzMjk4NiwiZXhwIjoxNzE2MzM2NTg2LCJpYXQiOjE3MTYzMzI5ODYsImp0aSI6Ijg5ZTk0OTA4LTkyMjItNGQ1NC1hNzMzLTk0OGQ4ZGM0ZjU1ZCIsInVzZXJuYW1lIjoidGVzdCJ9.TsiH7r9PKHJS9lkS83nKJrKYBkTkbWYiFHphb-kyqsN3NXzcO0gd0vhMLDCW4TXicL7G8Yod5Vsvy4q8DixvE_nElHLNI81qW0g2dqryydjzoY-HoCW2a0wW0trAGOoXv98NpjqWsKiDzU8D_ieGILqPXAl4sNngs_xyxwr0a74tnWChbMBiRH06OeHoWhD183rZIVZC0nYkCRphl2rYL7YmaYCzyvM9Gush0l-z6cO472ntEsYhudTW7T-ANQ8S6V4d0G6L4by8ccCtmSmzNn13osxJUEE4vjiNnIVt6DlGB6grm9bRQrusdztxRYZcvriaB1B73lJD4YXnbFrbPQ",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
```



### 5. deleteMemberFromHousehold


The `deleteMemberFromHousehold` endpoint is a HTTP POST request that is used to delete a member from a household in the system. The request should include the `authorizationToken` for authentication, the `householdId` to specify the household, the `memberUuid` to identify the member to be deleted, the `ipAddress` for tracking, and the `deviceDetails` for additional information.

### Response

The response for this request is a JSON object with a status code of 200 and a content type of `application/json`. The response schema is as follows:

``` json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        }
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/deleteMemberFromHousehold
```



***Body:***

```js
{
    "authorizationToken": "your-jwt-token-here",
    "householdId": "household-id-here",
    "memberUuid": "member-uuid-to-remove",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

```



### 6. editHousehold



### Edit Household
The `editHousehold` endpoint is used to edit the details of a household.

#### Request
- Method: POST
- URL: `api.dev.thepurplepiggybank.com/editHousehold`
- Headers:
  - Content-Type: application/json

##### Request Body Parameters
- `householdId` (string, required): The ID of the household to be edited.
- `householdName` (string, required): The name of the household.
- `authorizationToken` (string, required): The authorization token for the request.
- `customHouseholdNameSuchAsCrew` (string, required): A custom name for the household.
- `account` (string, required): The account details.
- `ipAddress` (string, required): The IP address of the device.
- `deviceDetails` (string, required): Details of the device.

#### Response
The response is in JSON format and has the following schema:
```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string"
    },
    "householdId": {
      "type": "string"
    },
    "householdName": {
      "type": "string"
    },
    "customHouseholdNameSuchAsCrew": {
      "type": "string"
    },
    "account": {
      "type": "string"
    },
    "setupComplete": {
      "type": "boolean"
    },
    "activeSubscription": {
      "type": "boolean"
    }
  }
}
```
- Status: 200
- Content-Type: application/json
- `message` (string): A message related to the request.
- `householdId` (string): The ID of the household.
- `householdName` (string): The name of the household.
- `customHouseholdNameSuchAsCrew` (string): A custom name for the household.
- `account` (string): The account details.
- `setupComplete` (boolean): Indicates if the setup is complete.
- `activeSubscription` (boolean): Indicates if the subscription is active.



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/editHousehold
```



***Body:***

```js
{
    "householdId": "5849cc41-7e74-42df-a2da-5689ca44cde3",
    "householdName": "Doe Family2",
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmNDc4ZjQwOC0wMDYxLTcwYjctMDkyNC1kODI1ZmU4YWEwYTUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImZmNTNiOGRlLTljZmQtNDdkYi1iNjEzLTkyMTIzNzc0M2IzOSIsImV2ZW50X2lkIjoiNzc3NjZmYzUtOGUwNC00NjVlLWE5ZTYtNzc4ODZlNGUxOTZlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjMzMjk4NiwiZXhwIjoxNzE2MzM2NTg2LCJpYXQiOjE3MTYzMzI5ODYsImp0aSI6Ijg5ZTk0OTA4LTkyMjItNGQ1NC1hNzMzLTk0OGQ4ZGM0ZjU1ZCIsInVzZXJuYW1lIjoidGVzdCJ9.TsiH7r9PKHJS9lkS83nKJrKYBkTkbWYiFHphb-kyqsN3NXzcO0gd0vhMLDCW4TXicL7G8Yod5Vsvy4q8DixvE_nElHLNI81qW0g2dqryydjzoY-HoCW2a0wW0trAGOoXv98NpjqWsKiDzU8D_ieGILqPXAl4sNngs_xyxwr0a74tnWChbMBiRH06OeHoWhD183rZIVZC0nYkCRphl2rYL7YmaYCzyvM9Gush0l-z6cO472ntEsYhudTW7T-ANQ8S6V4d0G6L4by8ccCtmSmzNn13osxJUEE4vjiNnIVt6DlGB6grm9bRQrusdztxRYZcvriaB1B73lJD4YXnbFrbPQ",
    "customHouseholdNameSuchAsCrew": "Doe Crew",
    "account": "standard",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
```



### 7. getHousehold



### Get Household

This endpoint allows you to retrieve household information.

#### Request Body
- `authorizationToken` (string, optional): The authorization token for accessing the household information.
- `ipAddress` (string, optional): The IP address of the device.
- `deviceDetails` (string, optional): Details of the device.
- `page` (integer): The page number for paginated results.

#### Response
The response is an array of household objects with the following properties:
- `householdId` (string): The unique identifier for the household.
- `householdName` (string): The name of the household.
- `creationDate` (string): The date of household creation.
- `customHouseholdNameSuchAsCrew` (string): Custom name for the household.
- `account` (string): Account information related to the household.
- `setupComplete` (boolean): Indicates if the household setup is complete.
- `activeSubscription` (boolean): Indicates if the household has an active subscription.

#### JSON Schema
```json
[
  {
    "type": "object",
    "properties": {
      "householdId": {"type": "string"},
      "householdName": {"type": "string"},
      "creationDate": {"type": "string"},
      "customHouseholdNameSuchAsCrew": {"type": "string"},
      "account": {"type": "string"},
      "setupComplete": {"type": "boolean"},
      "activeSubscription": {"type": "boolean"}
    }
  }
]



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getHousehold
```



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmNDc4ZjQwOC0wMDYxLTcwYjctMDkyNC1kODI1ZmU4YWEwYTUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImI5ZWZmNThmLTdjYzctNGU3Ni05YzM2LTRiYjhhOTU4MWQzMSIsImV2ZW50X2lkIjoiMWQ4YWVkYmItN2E1Mi00NTk2LThlNzYtNjJhZGQ4NDZlOGUwIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjM5OTM0NiwiZXhwIjoxNzE2NDAyOTQ2LCJpYXQiOjE3MTYzOTkzNDYsImp0aSI6IjgxN2JhOGUyLTA1YWMtNDBjNC05ZjgzLWMzOTI4NzhlM2YwYyIsInVzZXJuYW1lIjoidGVzdCJ9.bwBWuimjI24EGwHD1EA8ZP3vC25DwwyU8velugd-AdF71lY_bTcgBvNtgnEVjrbEoz5Ji-yddsC_qy2gJaOmzbntNEYVAm4rvdglJGg2KYMVy6_0iKU-EWQ6N4m2wKE3QHtmfmXYD-B4S7378KAcOkiLgkwt0Dvmcmmxa0gQdvEe9df451LR7yGRBcW1k-L_OTXmD4oLSZR_xnGc5lJuD2DPtR_VvjQToTNjpeNqUIOGwVo9ik_yuBGkqX7eOlLcgqVsIaaOsF0gvQQQnJyQ_AGuLH-b-BljGzn5b-fwfjOkf9c3rNkEFW6JJ3J0Otjo2zt2A8pMq97JrA5sxsYmzA",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "page": 1
}
```



### 8. getHouseholdById


The `api.dev.thepurplepiggybank.com/getHouseholdById` endpoint is a POST request that retrieves household information based on the provided household ID.

### Request Body

- `authorizationToken` (string): The authorization token for accessing the household information.
- `householdId` (string): The unique identifier of the household.
- `ipAddress` (string): The IP address of the device making the request.
- `deviceDetails` (string): Details of the device making the request.


### Response

The response will be in JSON format with the following schema:

``` json
{
  "householdId": "string",
  "householdName": "string",
  "creationDate": "string",
  "customHouseholdNameSuchAsCrew": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "account": "string",
  "setupComplete": true,
  "activeSubscription": true,
  "members": [
    {
      "id": "string",
      "householdId": "string",
      "memberUuid": "string",
      "role": "string",
      "joinedDate": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "incomes": [],
  "bills": [],
  "preferences": [],
  "invitations": [],
  "paymentSources": [],
  "users": [],
  "ledger": [
    {
      "ledgerId": "string",
      "householdId": "string",
      "paymentSourceId": "string",
      "amount": 0,
      "transactionType": "string",
      "transactionDate": "string",
      "category": "string",
      "description": "string",
      "status": true,
      "createdAt": "string",
      "updatedAt": "string",
      "updatedBy": "string",
      "billId": null,
      "incomeId": null,
      "runningTotal": 0,
      "interestRate": null,
      "cashBack": null,
      "tags": null
    }
  ]
}

 ```

The response includes details about the household, its members, financial transactions, and related entities.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getHouseholdById
```



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmNDc4ZjQwOC0wMDYxLTcwYjctMDkyNC1kODI1ZmU4YWEwYTUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImE1MzVhNTZjLTEwYTUtNDRjYS1hZWUxLWYwMWFjODY5YTM4OCIsImV2ZW50X2lkIjoiYjAzNzRhMTktZDdhOS00ODMyLTljZmMtYWFmZDFiNGY1ZmQwIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjMzMzk2OSwiZXhwIjoxNzE2MzM3NTY5LCJpYXQiOjE3MTYzMzM5NjksImp0aSI6Ijc1ZWI5YWNjLTcyZjYtNDkxNy1hZDRhLTc1NzdkODljNTY3ZCIsInVzZXJuYW1lIjoidGVzdCJ9.Cgh33ZplRSQm51vOrLocVkjumqu0MMi9UdMjZ0XOI-NwQvXLgxV6V7XoswDJcHPnbP_1tQ8iiZzSTmB2oy0Qcl_rNjlho602qvuXaxMl1FLrCLpbPE352X5MZamRRq47Z15nPCqGapoDQkHfJDhZAgYo9LXiMeE7WvSQYjTGYUGvxQ9zWOjuUzyGqV1SOtpVhEpDoClExyVaQCEskZmpjv-1LGuzoJsgMaM31NdfEDpN9fEskowW2zP_FX4SyDQCTW2nyuPh9jmb723X8Ab5g64fo70-SW9y0nf4mqU8DNQMTdDVnAjYsC4GblOedKVBqdrjbNIpA3zoMqoAMmQ0xg",
    "householdId": "43c2a801-4c50-4b64-b804-6c14dd7ffe76",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
```



### 9. getHouseholdMembers



The `POST /getHouseholdMembers` endpoint is used to retrieve the household members associated with a specific household.

### Request Body
- `authorizationToken` (string, required): The authorization token for the request.
- `householdId` (string, required): The ID of the household for which the members are being retrieved.

### Response
The response will be a JSON object with the following properties:
- `message` (string): A message related to the response.
- `members` (array): An array of household members, each containing the following properties:
  - `memberUuid` (string): The UUID of the member.
  - `role` (string): The role of the member within the household.
  - `joinedDate` (string): The date when the member joined the household.
  - `user` (object): An object containing details about the user, including:
    - `username` (string): The username of the user.
    - `firstName` (string): The first name of the user.
    - `lastName` (string): The last name of the user.
    - `email` (string): The email address of the user.
    - `phoneNumber` (string): The phone number of the user.

#### JSON Schema
```json
{
  "type": "object",
  "properties": {
    "message": { "type": "string" },
    "members": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "memberUuid": { "type": "string" },
          "role": { "type": "string" },
          "joinedDate": { "type": "string" },
          "user": {
            "type": "object",
            "properties": {
              "username": { "type": "string" },
              "firstName": { "type": "string" },
              "lastName": { "type": "string" },
              "email": { "type": "string" },
              "phoneNumber": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getHouseholdMembers
```



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmNDc4ZjQwOC0wMDYxLTcwYjctMDkyNC1kODI1ZmU4YWEwYTUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImZmNTNiOGRlLTljZmQtNDdkYi1iNjEzLTkyMTIzNzc0M2IzOSIsImV2ZW50X2lkIjoiNzc3NjZmYzUtOGUwNC00NjVlLWE5ZTYtNzc4ODZlNGUxOTZlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjMzMjk4NiwiZXhwIjoxNzE2MzM2NTg2LCJpYXQiOjE3MTYzMzI5ODYsImp0aSI6Ijg5ZTk0OTA4LTkyMjItNGQ1NC1hNzMzLTk0OGQ4ZGM0ZjU1ZCIsInVzZXJuYW1lIjoidGVzdCJ9.TsiH7r9PKHJS9lkS83nKJrKYBkTkbWYiFHphb-kyqsN3NXzcO0gd0vhMLDCW4TXicL7G8Yod5Vsvy4q8DixvE_nElHLNI81qW0g2dqryydjzoY-HoCW2a0wW0trAGOoXv98NpjqWsKiDzU8D_ieGILqPXAl4sNngs_xyxwr0a74tnWChbMBiRH06OeHoWhD183rZIVZC0nYkCRphl2rYL7YmaYCzyvM9Gush0l-z6cO472ntEsYhudTW7T-ANQ8S6V4d0G6L4by8ccCtmSmzNn13osxJUEE4vjiNnIVt6DlGB6grm9bRQrusdztxRYZcvriaB1B73lJD4YXnbFrbPQ",
    "householdId": "5849cc41-7e74-42df-a2da-5689ca44cde3"
}
```



## Income



### 1. addIncome



### Add Income

The `addIncome` endpoint is used to add income details.

**Request Body**
- `authorizationToken` (string): The authorization token for the request.
- `householdId` (string): The ID of the household.
- `name` (string): The name of the income.
- `amount` (string): The amount of the income.
- `firstPayDay` (string): The first payday for the income.
- `frequency` (string): The frequency of the income.
- `description` (string): Description of the income.
- `ipAddress` (string): The IP address of the device.
- `deviceDetails` (string): Details of the device.
- `paymentSourceId` (string): The ID of the payment source.

**Response**
```json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        },
        "income": {
            "type": "object",
            "properties": {
                "incomeId": {
                    "type": "string"
                },
                "householdId": {
                    "type": "string"
                },
                "name": {
                    "type": "string"
                },
                "amount": {
                    "type": "number"
                },
                "frequency": {
                    "type": "string"
                },
                "firstPayDay": {
                    "type": "string"
                },
                "createdAt": {
                    "type": "string"
                },
                "updatedAt": {
                    "type": "string"
                }
            }
        }
    }
}
```



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/addIncome
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImEwYmM0NGYzLTQ2NzctNGVmMi05ZWJiLTQ1NDQzYjg1ODU4YiIsImV2ZW50X2lkIjoiODIxYmRiNDgtY2NkYi00ZTViLTgyZjEtNTA5NDM4ZThhN2Y0IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4OTk2OSwiZXhwIjoxNzE2NDkzNTY5LCJpYXQiOjE3MTY0ODk5NjksImp0aSI6ImJjNTM1NzJiLTIzZjctNDRjOC1iYzhhLTBjOWZkYmExM2I0ZCIsInVzZXJuYW1lIjoidGVzdCJ9.rJaXxjzQRrecjJfqvaQmhtNUFC0wRVttDiVccAO9m7P5Dj3eh7PyPbQu4meA13R_LUdI14l5OvXWMJqPkSQqlMO9XoIwPximwx2RgWghLZWHh-e3e3bC4c5UIUQeM7CiOUt6jujXPw_tMTkalb6It48EZ14OpZxpSA7ypfzWmUUYotFpe86daWVDzLiq6And3knnc0WWySB2dh0GwvCPG3UUg6oN_hKg2ctyGYsUpgDcIHwuesIU_8YnFnU6dQxKYqSnrcmk5naqkXIC8LysC4g9hHuQt3tXweo3eBvUojZAGgC_tUIZCqUsT5BJFljP5Q_dPvLU1-ydSCk8TvWSzw",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
    "name": "Test",
    "amount": "3000.01",
    "firstPayDay": "2024-05-19",
    "frequency": "biweekly",
    "description": "job1",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "iPhone 12, iOS 14.4",
  "paymentSourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2"
}
```



### 2. deleteIncome.js


### DELETE Income

This endpoint is used to delete an income record.

#### Request

- Method: POST

- URL: `api.dev.thepurplepiggybank.com/deleteIncome`

- Headers:
    - Content-Type: application/json

- Body:
    - authorizationToken (text, required): The authorization token for the user.

    - incomeId (text, required): The ID of the income to be deleted.

    - ipAddress (text, optional): The IP address of the device.

    - deviceDetails (text, optional): Details of the device.


#### Response

The response is in JSON format and includes a message indicating the status of the operation.

#### Response Schema

``` json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        }
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/deleteIncome
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImEwYmM0NGYzLTQ2NzctNGVmMi05ZWJiLTQ1NDQzYjg1ODU4YiIsImV2ZW50X2lkIjoiODIxYmRiNDgtY2NkYi00ZTViLTgyZjEtNTA5NDM4ZThhN2Y0IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4OTk2OSwiZXhwIjoxNzE2NDkzNTY5LCJpYXQiOjE3MTY0ODk5NjksImp0aSI6ImJjNTM1NzJiLTIzZjctNDRjOC1iYzhhLTBjOWZkYmExM2I0ZCIsInVzZXJuYW1lIjoidGVzdCJ9.rJaXxjzQRrecjJfqvaQmhtNUFC0wRVttDiVccAO9m7P5Dj3eh7PyPbQu4meA13R_LUdI14l5OvXWMJqPkSQqlMO9XoIwPximwx2RgWghLZWHh-e3e3bC4c5UIUQeM7CiOUt6jujXPw_tMTkalb6It48EZ14OpZxpSA7ypfzWmUUYotFpe86daWVDzLiq6And3knnc0WWySB2dh0GwvCPG3UUg6oN_hKg2ctyGYsUpgDcIHwuesIU_8YnFnU6dQxKYqSnrcmk5naqkXIC8LysC4g9hHuQt3tXweo3eBvUojZAGgC_tUIZCqUsT5BJFljP5Q_dPvLU1-ydSCk8TvWSzw",
    "incomeId": "1c838242-3813-45c9-96ed-09a9498eff12",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Device Name/Model"
}
```



### 3. editIncome.js


### Edit Income

The `editIncome` endpoint is used to update income details.

**Request Body**

- `authorizationToken` (string, required): The authorization token for the request.

- `incomeId` (string, required): The ID of the income to be edited.

- `householdId` (string, required): The ID of the household to which the income belongs.

- `name` (string, required): The name of the income.

- `amount` (number, required): The amount of the income.

- `firstPayDay` (string, required): The first payday of the income.

- `frequency` (string, required): The frequency of the income.

- `description` (string, required): The description of the income.

- `ipAddress` (string, required): The IP address of the device making the request.

- `deviceDetails` (string, required): Details of the device making the request.

- `paymentSourceId` (string, required): The ID of the payment source for the income.


**Response**

``` json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        },
        "income": {
            "type": "object",
            "properties": {
                "incomeId": {
                    "type": "string"
                },
                "householdId": {
                    "type": "string"
                },
                "name": {
                    "type": "string"
                },
                "amount": {
                    "type": "number"
                },
                "frequency": {
                    "type": "string"
                },
                "firstPayDay": {
                    "type": "string"
                },
                "createdAt": {
                    "type": "string"
                },
                "updatedAt": {
                    "type": "string"
                }
            }
        }
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/editIncome
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImEwYmM0NGYzLTQ2NzctNGVmMi05ZWJiLTQ1NDQzYjg1ODU4YiIsImV2ZW50X2lkIjoiODIxYmRiNDgtY2NkYi00ZTViLTgyZjEtNTA5NDM4ZThhN2Y0IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4OTk2OSwiZXhwIjoxNzE2NDkzNTY5LCJpYXQiOjE3MTY0ODk5NjksImp0aSI6ImJjNTM1NzJiLTIzZjctNDRjOC1iYzhhLTBjOWZkYmExM2I0ZCIsInVzZXJuYW1lIjoidGVzdCJ9.rJaXxjzQRrecjJfqvaQmhtNUFC0wRVttDiVccAO9m7P5Dj3eh7PyPbQu4meA13R_LUdI14l5OvXWMJqPkSQqlMO9XoIwPximwx2RgWghLZWHh-e3e3bC4c5UIUQeM7CiOUt6jujXPw_tMTkalb6It48EZ14OpZxpSA7ypfzWmUUYotFpe86daWVDzLiq6And3knnc0WWySB2dh0GwvCPG3UUg6oN_hKg2ctyGYsUpgDcIHwuesIU_8YnFnU6dQxKYqSnrcmk5naqkXIC8LysC4g9hHuQt3tXweo3eBvUojZAGgC_tUIZCqUsT5BJFljP5Q_dPvLU1-ydSCk8TvWSzw",
    "incomeId": "bcdc723d-5ef2-4e0e-b776-533a23df984f",
    "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
    "name": "Salary",
    "amount": 5000.00,
    "firstPayDay": "2024-06-01",
    "frequency": "monthly",
    "description": "Monthly salary payment",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Device details here",
    "paymentSourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2"
}
```



### 4. getIncome


### API Request Description

This API endpoint is a POST request to `api.dev.thepurplepiggybank.com/getIncome` to retrieve income information. The request should include the following parameters in the raw request body:

- `authorizationToken` (string): The authorization token for authentication.

- `incomeId` (string): The ID of the income.

- `ipAddress` (string): The IP address of the device making the request.

- `deviceDetails` (string): Details of the device making the request.


### API Response

The API returns a JSON response with a status code of 404 and a content type of `application/json`. The response body includes the following schema:

``` json
{
    "message": ""
}

 ```

The `message` field in the response contains the relevant information or error message.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getIncome
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImEwYmM0NGYzLTQ2NzctNGVmMi05ZWJiLTQ1NDQzYjg1ODU4YiIsImV2ZW50X2lkIjoiODIxYmRiNDgtY2NkYi00ZTViLTgyZjEtNTA5NDM4ZThhN2Y0IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4OTk2OSwiZXhwIjoxNzE2NDkzNTY5LCJpYXQiOjE3MTY0ODk5NjksImp0aSI6ImJjNTM1NzJiLTIzZjctNDRjOC1iYzhhLTBjOWZkYmExM2I0ZCIsInVzZXJuYW1lIjoidGVzdCJ9.rJaXxjzQRrecjJfqvaQmhtNUFC0wRVttDiVccAO9m7P5Dj3eh7PyPbQu4meA13R_LUdI14l5OvXWMJqPkSQqlMO9XoIwPximwx2RgWghLZWHh-e3e3bC4c5UIUQeM7CiOUt6jujXPw_tMTkalb6It48EZ14OpZxpSA7ypfzWmUUYotFpe86daWVDzLiq6And3knnc0WWySB2dh0GwvCPG3UUg6oN_hKg2ctyGYsUpgDcIHwuesIU_8YnFnU6dQxKYqSnrcmk5naqkXIC8LysC4g9hHuQt3tXweo3eBvUojZAGgC_tUIZCqUsT5BJFljP5Q_dPvLU1-ydSCk8TvWSzw",
    "incomeId": "bcdc723d-5ef2-4e0e-b776-533a23df984f",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Device Name/Model"
}
```



### 5. getIncomes


The `POST` request to `/getIncomes` endpoint is used to retrieve incomes from the purple piggy bank API.

### Request Body

- `authorizationToken` (string): The authorization token for authentication.

- `householdId` (string): The ID of the household for which incomes are being retrieved.

- `ipAddress` (string): The IP address of the device making the request.

- `deviceDetails` (string): Details of the device making the request.


### Response

The response returns a JSON schema with the following structure:

``` json
{
    "message": ""
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getIncomes
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImEwYmM0NGYzLTQ2NzctNGVmMi05ZWJiLTQ1NDQzYjg1ODU4YiIsImV2ZW50X2lkIjoiODIxYmRiNDgtY2NkYi00ZTViLTgyZjEtNTA5NDM4ZThhN2Y0IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4OTk2OSwiZXhwIjoxNzE2NDkzNTY5LCJpYXQiOjE3MTY0ODk5NjksImp0aSI6ImJjNTM1NzJiLTIzZjctNDRjOC1iYzhhLTBjOWZkYmExM2I0ZCIsInVzZXJuYW1lIjoidGVzdCJ9.rJaXxjzQRrecjJfqvaQmhtNUFC0wRVttDiVccAO9m7P5Dj3eh7PyPbQu4meA13R_LUdI14l5OvXWMJqPkSQqlMO9XoIwPximwx2RgWghLZWHh-e3e3bC4c5UIUQeM7CiOUt6jujXPw_tMTkalb6It48EZ14OpZxpSA7ypfzWmUUYotFpe86daWVDzLiq6And3knnc0WWySB2dh0GwvCPG3UUg6oN_hKg2ctyGYsUpgDcIHwuesIU_8YnFnU6dQxKYqSnrcmk5naqkXIC8LysC4g9hHuQt3tXweo3eBvUojZAGgC_tUIZCqUsT5BJFljP5Q_dPvLU1-ydSCk8TvWSzw",
    "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
}
```



## Notifications



### 1. addNotification


### Add Notification

This endpoint is used to add a notification, which is triggered anytime a new bill is created.

#### Request

- Method: POST

- URL: `api.dev.thepurplepiggybank.com/addNotification`


##### Request Body

- Type: JSON


| Key | Type | Description |
| --- | --- | --- |
| authorizationToken | String | The authorization token |
| billId | String | The ID of the bill |
| title | String | The title of the notification |
| message | String | The message content of the notification |
| userUuid | String | The UUID of the user |
| deviceDetails | String | Details of the device triggering the notification (e.g. Device XYZ, OS ABC) |
| ipAddress | String | The IP address of the triggering device |

#### Response

The response for this request is a JSON object following the schema below:

``` json
{
  "notificationId": "string",
  "timestamp": "string",
  "status": "string",
  "message": "string"
}

 ```

- `notificationId`: The ID of the added notification

- `timestamp`: The timestamp when the notification was added

- `status`: The status of the notification request

- `message`: A message indicating the result of the notification request


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/addNotification
```



***Body:***

```js
{
    //This is called anytime a new bill is created
  "authorizationToken": "your-authorization-token",
  "billId": "example-bill-id",
  "title": "Upcoming Bill Payment",
  "message": "Your bill for May is due on the 25th.",
  "userUuid": "example-user-uuid",
  "deviceDetails": "Device XYZ, OS ABC",
  "ipAddress": "192.168.1.1"
}

```



### 2. deleteNotification


The `POST` request to `/deleteNotification` endpoint is used to delete a specific notification. The request should include the `authorizationToken` for authentication, the `notificationId` of the notification to be deleted, `deviceDetails` containing information about the device, and `ipAddress` indicating the IP address of the device.

### Request Body

- `authorizationToken` (string): The authorization token for authentication.

- `notificationId` (string): The unique identifier of the notification to be deleted.

- `deviceDetails` (string): Information about the device from which the request is made.

- `ipAddress` (string): The IP address of the device making the request.


### Response (JSON Schema)

``` json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string"
    },
    "message": {
      "type": "string"
    }
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/deleteNotification
```



***Body:***

```js
{
        //This is called anytime a deleteBill is called

  "authorizationToken": "your-authorization-token",
  "notificationId": "example-notification-id",
  "deviceDetails": "Device XYZ, OS ABC",
  "ipAddress": "192.168.1.1"
}

```



### 3. editNotification


### Edit Notification

This endpoint allows you to edit a notification, typically used for updating a bill payment reminder.

**HTTP Request Method**: POST

**Request URL**: `api.dev.thepurplepiggybank.com/editNotification`

#### Request Body

- `authorizationToken` (string, required): The authorization token for the request.

- `notificationId` (string, required): The unique identifier of the notification to be edited.

- `title` (string, required): The updated title for the notification.

- `message` (string, required): The updated message content for the notification.

- `read` (boolean, required): Indicates whether the notification has been read or not.

- `deviceDetails` (string, required): Details of the device from which the edit action is initiated.

- `ipAddress` (string, required): The IP address of the device initiating the edit action.


#### Response (JSON Schema)

``` json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string"
    },
    "message": {
      "type": "string"
    }
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/editNotification
```



***Body:***

```js
{
        //This is called anytime a edit bill is called

  "authorizationToken": "your-authorization-token",
  "notificationId": "example-notification-id",
  "title": "Updated Bill Payment Reminder",
  "message": "Your bill for May is now due on the 28th.",
  "read": false,
  "deviceDetails": "Device XYZ, OS ABC",
  "ipAddress": "192.168.1.1"
}

```



### 4. getNotifications


### Get Notifications

This endpoint is used to retrieve notifications from the server.

#### Request Body

- `authorizationToken` (string, required): The authorization token for the request.

- `deviceDetails` (string, required): Details of the device making the request.

- `ipAddress` (string, required): The IP address of the device making the request.


#### Response

The response for this request will be a JSON object following the schema below:

``` json
{
  "notifications": [
    {
      "id": "string",
      "message": "string",
      "timestamp": "string"
    }
  ]
}

 ```

The response will contain an array of notifications, each with an `id`, `message`, and `timestamp`.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getNotifications
```



***Body:***

```js
{
  "authorizationToken": "your-authorization-token",
  "deviceDetails": "Device XYZ, OS ABC",
  "ipAddress": "192.168.1.1"
}

```



## PaymentSource



### 1. addPaymentSource


### Add Payment Source

This endpoint allows users to add a payment source to their account.

#### Request Body

- `authorizationToken` (string): The authorization token for the request.
- `householdId` (string): The ID of the household to which the payment source is being added.
- `sourceName` (string): The name of the payment source, e.g., "Ally Bank".
- `sourceType` (string): The type of the payment source, e.g., "Bank".
- `details` (string): Additional details about the payment source, e.g., "Joint Account".
- `ipAddress` (string): The IP address of the device making the request.
- `deviceDetails` (string): Details of the device used for the request.


#### Response (201 - Created)

``` json
{
    "message": "",
    "paymentSource": {
        "sourceId": "",
        "householdId": "",
        "sourceName": "",
        "sourceType": "",
        "details": "",
        "createdAt": "",
        "updatedAt": ""
    }
}

 ```

#### Request Description

This POST request adds a payment source to the user's account. The request body should include the authorization token, household ID, source name, source type, details, IP address, and device details.

#### Response Description

The response returns a message and the details of the newly added payment source, including the source ID, household ID, source name, source type, details, creation timestamp, and last update timestamp.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/addPaymentSource
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjQ1Zjk4YTM5LTc1OTMtNDA5NC1hNjQ0LTFkZjA2Zjc0ODMwNCIsImV2ZW50X2lkIjoiZTBmMjBiN2YtMzIyYS00MjI4LWExOTEtMDk5MTQ4MWI1MmU2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ5MDgwNywiZXhwIjoxNzE2NDk0NDA3LCJpYXQiOjE3MTY0OTA4MDcsImp0aSI6ImFkYjVmMTllLTZlNzYtNGVmOS04OGRmLTM2YmVmZTE1MDU3OCIsInVzZXJuYW1lIjoidGVzdCJ9.ErmuIRD3BBVCDrKKhThgfCKKKnmyj4IiX7M8WnhdQR_ttHWjH0uNb3vOk1TfHL4ScQaQmg_iSj24lACwKgimsO1LoVLq5TDLhIV8iLtAx794LovPJQshJ4EtaDXzh8iB9Cv8qq-jmWtec0EMrxwzrpfX5ogCuicMwoGLGRK9yekV4nMfg3I6VfuVSO2oMtHOw-ATlDHyTLMp-bCPYEFUEjTa5TXBpqhBrBqpH8a9iYi6Cog5fe9fC7306iWOpDAUTnXomOU-dXnPj0R-Gvz4gxuk18lhydE9e6x0uBZfazJdFPS-UxHQiuIuUxq1v1lwO64FD8Re-t7kDl9tZJD7rg",
  "householdId": "f109960f-b082-44d7-bd86-0a85f3fe24a0",
  "sourceName": "Ally Bank",
  "sourceType": "Bank",
  "details": "Joint Account", // Description would be a better name for this
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

```



### 2. deletePaymentSource


### API Request Description

This API endpoint is used to delete a payment source. The request should be sent as an HTTP POST to `api.dev.thepurplepiggybank.com/deletePaymentSource`. The request body should be in raw JSON format and should include the following parameters:

- `authorizationToken` (string): The authorization token for the request.

- `sourceId` (string): The ID of the payment source to be deleted.

- `householdId` (string): The ID of the household associated with the payment source.

- `ipAddress` (string): The IP address of the device making the request.

- `deviceDetails` (string): Details of the device making the request.


### API Response

The response to this request will be in JSON format and should follow the schema below:

``` json
{
  "status": "string",
  "message": "string"
}

 ```

- `status` (string): Indicates the status of the request, whether it was successful or not.

- `message` (string): Provides additional information about the status of the request.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/deletePaymentSource
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmNDc4ZjQwOC0wMDYxLTcwYjctMDkyNC1kODI1ZmU4YWEwYTUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjRmMjBkN2IwLTBkYTEtNDZkMy1iOGY1LTg3NGI0M2UyN2NlNSIsImV2ZW50X2lkIjoiNDI3NTJjYzctYTUxOS00ODQxLTkwNzktYTlmNmE5OGZhYzAzIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjMzNjc1NiwiZXhwIjoxNzE2MzQwMzU2LCJpYXQiOjE3MTYzMzY3NTYsImp0aSI6IjYzZDM5YWM0LTc5NjYtNGU1OC1iMmU3LWZmYjYyMDE3YTA3NCIsInVzZXJuYW1lIjoidGVzdCJ9.sgUu2uirwwYQazrcpwNwEa8pCwF53j3GbeOy4rAnpuT4UP_tv4vnMV3v-NRR7qOsN9hTKQEwUdPdtH2ZVqpCvXMV3UZwa-95ksvYVYMshMLXPsPMaBdwcL3sKqcXKPWmTFCiWUl2qRTat4gF0agPCTj2F_nYAXvTVtjufv9N5hutzuGyHl7xL6VGDnFUePjSWQ2J4MwvAy1P_qcXkoKWgNc5dLteFTVn5UUPrRs5_7NL-eoIR3BqlCD3j-g7e11wJV-rILtsp2B2FnQv5GYh7f4iv5rOpYT_j8yZTL7nnAutxc07sLubyvvaL0NFnBlCdYYG6tsXNGuRJSQx_5JfqA",
  "sourceId": "bde3c57a-1b93-45aa-b908-8c642d0ee72b",
  "householdId": "43c2a801-4c50-4b64-b804-6c14dd7ffe76",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

```



### 3. editPaymentSource


### Edit Payment Source

The `editPaymentSource` endpoint is used to update the payment source details.

#### Request

- Method: POST
- URL: `api.dev.thepurplepiggybank.com/editPaymentSource`
- Headers:
    - Content-Type: application/json
- Body:
    - sourceId (string): The ID of the payment source to be updated.
    - authorizationToken (string): The authorization token for the request.
    - householdId (string): The ID of the household associated with the payment source.
    - sourceName (string): The name of the payment source.
    - sourceType (string): The type of the payment source (e.g., Bank, Card).
    - details (string): The description of the payment source.
    - ipAddress (string): The IP address of the device making the request.
    - deviceDetails (string): Details of the device used for the request.

#### Response

The response is in JSON format and has the following schema:

``` json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        },
        "paymentSource": {
            "type": "object",
            "properties": {
                "sourceId": {
                    "type": "string"
                },
                "householdId": {
                    "type": "string"
                },
                "sourceName": {
                    "type": "string"
                },
                "sourceType": {
                    "type": "string"
                },
                "details": {
                    "type": "string"
                },
                "createdAt": {
                    "type": "string"
                },
                "updatedAt": {
                    "type": "string"
                }
            }
        }
    }
}

 ```

- Status: 200
- Content-Type: application/json


The response includes a `message` field and a `paymentSource` object with updated details of the payment source, including `sourceId`, `householdId`, `sourceName`, `sourceType`, `details`, `createdAt`, and `updatedAt`.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/editPaymentSource
```



***Body:***

```js
{
    "sourceId": "188d7d04-ffe9-4b28-98f5-b811a145afb7",
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJmNDc4ZjQwOC0wMDYxLTcwYjctMDkyNC1kODI1ZmU4YWEwYTUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImQ0YzZlMjM4LWNlY2ItNDM0Mi1hNDE3LWMwOTZlOGZhMTYzOCIsImV2ZW50X2lkIjoiN2E2NjkyZjktMzZmNy00ZTM2LWFhODEtMTFjNDliOTg1OTcyIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjMzNzcwMSwiZXhwIjoxNzE2MzQxMzAxLCJpYXQiOjE3MTYzMzc3MDEsImp0aSI6IjI0NjRhM2Y0LWEwNTYtNDI0Mi1iOWQxLWMwMjExNzljMjgyNCIsInVzZXJuYW1lIjoidGVzdCJ9.sXMPaIjwl5N7PIi_E2hbVj3Zub5gpgksjbAMB5jx5I_V_XuHM1vlRpjWT6d1I6ByALPVGwcYVBtPrgoDx5GdkthzZabWttOWLUH6yHGeYnSchm7wy6P4V8cWkm2hwy_yusqfTGxXrf4pSw7NCf6hAiHT3e-PMv1QZuaAK4VCuEJeoafQ6aNuHAAU4hEsGv7aQ-bsP4K3qwzNbmRZgRXCKhBfJNnsifFDq8wwktQXvUGrzX6wZTwrMJrORrsO8yDVMyNvtidZRGnRJ5SAUJ7Efe4b0AcXxCgrJG6J3cc0zpGfsFDIqkdlvY0W3D0HP9Iz0KdK3w1t10zv3UZxpAOQtA",
    "householdId": "43c2a801-4c50-4b64-b804-6c14dd7ffe76",
    "sourceName": "Ally Bank2",
    "sourceType": "Bank",
    "details": "Joint Account", // Description would be a better name for this
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
```



### 4. getPaymentSource


### Get Payment Source

This endpoint is used to retrieve payment sources associated with a specific household.

#### Request Body

- `authorizationToken` (text, required): The authorization token for accessing the payment sources.

- `householdId` (text, required): The ID of the household for which payment sources are to be retrieved.

- `ipAddress` (text, required): The IP address of the device from which the request is made.

- `deviceDetails` (text, required): Details of the device used for the request.


#### Response

Upon a successful request, the server responds with a status code of 200 and a JSON object containing the following fields:

- `message` (string): A message related to the request.

- `paymentSources` (array): An array of payment sources, each containing the following information:
    - `sourceId` (string): The ID of the payment source.

    - `householdId` (string): The ID of the household to which the payment source belongs.

    - `sourceName` (string): The name of the payment source.

    - `sourceType` (string): The type of the payment source.

    - `details` (string): Details of the payment source.

    - `createdAt` (string): The date and time when the payment source was created.

    - `updatedAt` (string): The date and time when the payment source was last updated.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getPaymentSource
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjgyMjliMGVlLWM0MWEtNDY3NS1hZTk4LTZiNjhjY2M4M2I4OCIsImV2ZW50X2lkIjoiMWNhMzFlNjktOGI0Zi00NWQxLTljMDQtZjMzOGNjZGNjYTVlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4Nzg2MCwiZXhwIjoxNzE2NDkxNDYwLCJpYXQiOjE3MTY0ODc4NjAsImp0aSI6IjA2YTFkMmFkLWU5NTEtNDFiMS05YWYwLTBjNjIxODA0MGIxMSIsInVzZXJuYW1lIjoidGVzdCJ9.sUHvc5nYW_couQU8GEIdcEv5LsYEWN6msbVT1sOxNQmceCvbb-9Eghe0d8BmUVFEtzbKChTfY_K-B-CobfzVOLeMm2SnAbWtQ42Bezr2U9YkAOYdf1eI7joe2N35yPhYefUZaT_k8LscRheC5A6gvfuAoEPNrVcu2HQ42sLk2ceYi8405Et6anTSSGmZ_zeY6aX1koAUfcuz_utpuEQgL_wkZwSj4SfYvUk9CovUCi9DdAtrSOfmFaoBt70n4QPtu1IQn3geIwsxmU94yJp5oCA6_vJMNekviW86MONy0bogC0MGuqo4MhHl4xki5A_kBJqm-ay5tbm-LFIhX1UaGQ",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

```



## Preferences



### 1. editCurrencyPreference



### Edit Currency Preference

This endpoint allows the user to edit the currency preference for a household.

**Request Body**
- `authorizationToken` (string): The authorization token for the request.
- `householdId` (string): The ID of the household for which the currency preference is being edited.
- `currencySymbol` (string): The new currency symbol to be set as the preference.
- `ipAddress` (string): The IP address of the device making the request.
- `deviceDetails` (string): Details of the device making the request.

**Response**
- `preferenceId` (string): The ID of the edited preference.
- `householdId` (string): The ID of the household for which the preference was edited.
- `preferenceType` (string): The type of preference edited.
- `preferenceValue` (string): The new value of the preference.
- `createdAt` (string): Timestamp of when the preference was created.
- `updatedAt` (string): Timestamp of when the preference was last updated.



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/editCurrencyPreference
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjgwNzExM2QwLTRlOGQtNDcxZS1hNDI5LTBiZTEzZGNkNGQxOSIsImV2ZW50X2lkIjoiMjliZTk1YmYtNTYyYS00Zjk2LWI1MjgtNmM0NjFjMWYyZjlkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4NDI0OSwiZXhwIjoxNzE2NDg3ODQ5LCJpYXQiOjE3MTY0ODQyNDksImp0aSI6IjBmNTdmOTMyLTg5YjAtNGJjNi05YWY4LTQ2NjMwMTAwNmRjMiIsInVzZXJuYW1lIjoidGVzdCJ9.HHVUQ4MFUdppPFqjwAbSS905BM-_swJSUva2aYU0E5amVXDTBJM8eXxWTXcR23zQ1pWq5wkRxu3Y43lVsr5icRCKGo9lwvZBbMMWIjTCYHt1X2H4g7rqcQSgu1resvT5qQKRn-Pk64n5nSYTNwGV2MoRFxoZMQkFhwfOh4CTyMFSKvo7HVxUtrAA-gVOt077kVqIW2jyD0T2AyNPmzb7prjI2EeEaILn0eNgMT5eEiz9XWiKNpC8gUtWyCxkb1vWo0mOfjKpdy84zzuwRtm3WVllv9rjozudkV1cbmYTKxHBaztjaOFwHu1Z0zBuycaboUarpdLbCwRgdDd1edNhTA",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "currencySymbol": "€",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36"
}

```



### 2. editDefaultPaymentSource


### Edit Default Payment Source

This endpoint is used to edit the default payment source for a household.

#### Request

- Method: POST

- URL: `api.dev.thepurplepiggybank.com/editDefaultPaymentSource`

- Headers:
    - Content-Type: application/json

- Body:
    - `authorizationToken` (string): The authorization token for the request.

    - `householdId` (string): The ID of the household for which the default payment source is to be edited.

    - `paymentSourceId` (string): The ID of the payment source to be set as default.

    - `ipAddress` (string): The IP address of the device making the request.

    - `deviceDetails` (string): Details of the device making the request.


#### Response

The response is in JSON format with the following schema:

``` json
{
  "type": "object",
  "properties": {
    "preference": {
      "type": "object",
      "properties": {
        "count": {
          "type": "integer"
        }
      }
    }
  }
}

 ```

- Status: 200

- Content-Type: application/json

- Body:

    ``` json
    {
      "preference": {
        "count": 0
      }
    }

     ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/editDefaultPaymentSource
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjgwNzExM2QwLTRlOGQtNDcxZS1hNDI5LTBiZTEzZGNkNGQxOSIsImV2ZW50X2lkIjoiMjliZTk1YmYtNTYyYS00Zjk2LWI1MjgtNmM0NjFjMWYyZjlkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4NDI0OSwiZXhwIjoxNzE2NDg3ODQ5LCJpYXQiOjE3MTY0ODQyNDksImp0aSI6IjBmNTdmOTMyLTg5YjAtNGJjNi05YWY4LTQ2NjMwMTAwNmRjMiIsInVzZXJuYW1lIjoidGVzdCJ9.HHVUQ4MFUdppPFqjwAbSS905BM-_swJSUva2aYU0E5amVXDTBJM8eXxWTXcR23zQ1pWq5wkRxu3Y43lVsr5icRCKGo9lwvZBbMMWIjTCYHt1X2H4g7rqcQSgu1resvT5qQKRn-Pk64n5nSYTNwGV2MoRFxoZMQkFhwfOh4CTyMFSKvo7HVxUtrAA-gVOt077kVqIW2jyD0T2AyNPmzb7prjI2EeEaILn0eNgMT5eEiz9XWiKNpC8gUtWyCxkb1vWo0mOfjKpdy84zzuwRtm3WVllv9rjozudkV1cbmYTKxHBaztjaOFwHu1Z0zBuycaboUarpdLbCwRgdDd1edNhTA",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "paymentSourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Device details here"
}

```



### 3. editThreshold



The `editThreshold` endpoint is a POST request that allows the user to modify a threshold value for a specific household within The Purple Piggy Bank system. The request should include the `authorizationToken` for authentication, `householdId` to identify the household, `newThreshold` to specify the new threshold value, `paymentSourceId` to indicate the payment source, `ipAddress` for tracking, and `deviceDetails` for additional context.

### Request Body
- `authorizationToken` (string): The authentication token.
- `householdId` (string): The identifier for the household.
- `newThreshold` (number): The new threshold value to be set.
- `paymentSourceId` (string): The identifier for the payment source.
- `ipAddress` (string): The IP address of the device making the request.
- `deviceDetails` (string): Additional details about the device making the request.

### Response
The response will have a status code of 404 and a content type of `application/json`. The response body will contain a JSON object with a `message` key, which may provide additional information about the error or the reason for the 404 status.

### JSON Schema for Response
```json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        }
    }
}
```



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/editThreshold
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjgyMjliMGVlLWM0MWEtNDY3NS1hZTk4LTZiNjhjY2M4M2I4OCIsImV2ZW50X2lkIjoiMWNhMzFlNjktOGI0Zi00NWQxLTljMDQtZjMzOGNjZGNjYTVlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4Nzg2MCwiZXhwIjoxNzE2NDkxNDYwLCJpYXQiOjE3MTY0ODc4NjAsImp0aSI6IjA2YTFkMmFkLWU5NTEtNDFiMS05YWYwLTBjNjIxODA0MGIxMSIsInVzZXJuYW1lIjoidGVzdCJ9.sUHvc5nYW_couQU8GEIdcEv5LsYEWN6msbVT1sOxNQmceCvbb-9Eghe0d8BmUVFEtzbKChTfY_K-B-CobfzVOLeMm2SnAbWtQ42Bezr2U9YkAOYdf1eI7joe2N35yPhYefUZaT_k8LscRheC5A6gvfuAoEPNrVcu2HQ42sLk2ceYi8405Et6anTSSGmZ_zeY6aX1koAUfcuz_utpuEQgL_wkZwSj4SfYvUk9CovUCi9DdAtrSOfmFaoBt70n4QPtu1IQn3geIwsxmU94yJp5oCA6_vJMNekviW86MONy0bogC0MGuqo4MhHl4xki5A_kBJqm-ay5tbm-LFIhX1UaGQ",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "newThreshold": 250.00,
  "paymentSourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36"
}

```



### 4. getCurrencyPreference


### Get Currency Preference

The `GET` request is used to retrieve the currency preference for a household.

#### Request Body

- `authorizationToken` (text, required): The authorization token for the request.

- `householdId` (text, required): The ID of the household for which the currency preference is being retrieved.

- `ipAddress` (text, required): The IP address of the device making the request.

- `deviceDetails` (text, required): Details of the device making the request.


#### Response

The response is a JSON object with the following schema:

``` json
{
  "preference": {
    "preferenceId": "",
    "householdId": "",
    "preferenceType": "",
    "preferenceValue": "",
    "createdAt": "",
    "updatedAt": ""
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getCurrencyPreference
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjgwNzExM2QwLTRlOGQtNDcxZS1hNDI5LTBiZTEzZGNkNGQxOSIsImV2ZW50X2lkIjoiMjliZTk1YmYtNTYyYS00Zjk2LWI1MjgtNmM0NjFjMWYyZjlkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4NDI0OSwiZXhwIjoxNzE2NDg3ODQ5LCJpYXQiOjE3MTY0ODQyNDksImp0aSI6IjBmNTdmOTMyLTg5YjAtNGJjNi05YWY4LTQ2NjMwMTAwNmRjMiIsInVzZXJuYW1lIjoidGVzdCJ9.HHVUQ4MFUdppPFqjwAbSS905BM-_swJSUva2aYU0E5amVXDTBJM8eXxWTXcR23zQ1pWq5wkRxu3Y43lVsr5icRCKGo9lwvZBbMMWIjTCYHt1X2H4g7rqcQSgu1resvT5qQKRn-Pk64n5nSYTNwGV2MoRFxoZMQkFhwfOh4CTyMFSKvo7HVxUtrAA-gVOt077kVqIW2jyD0T2AyNPmzb7prjI2EeEaILn0eNgMT5eEiz9XWiKNpC8gUtWyCxkb1vWo0mOfjKpdy84zzuwRtm3WVllv9rjozudkV1cbmYTKxHBaztjaOFwHu1Z0zBuycaboUarpdLbCwRgdDd1edNhTA",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36"
}

```



### 5. getDefaultPaymentSourcePreference


The `getDefaultPaymentSourcePreference` endpoint is a POST request that allows users to retrieve the default payment source preference. The request should include the `authorizationToken`, `householdId`, `ipAddress`, and `deviceDetails` in the payload.

### Response

The response will be in the form of a JSON schema and will have a status code of 200. The response body will contain the `preference` object with the `preferenceValue` attribute.

``` json
{
    "preference": {
        "preferenceValue": ""
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getDefaultPaymentSourcePreference
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjgwNzExM2QwLTRlOGQtNDcxZS1hNDI5LTBiZTEzZGNkNGQxOSIsImV2ZW50X2lkIjoiMjliZTk1YmYtNTYyYS00Zjk2LWI1MjgtNmM0NjFjMWYyZjlkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4NDI0OSwiZXhwIjoxNzE2NDg3ODQ5LCJpYXQiOjE3MTY0ODQyNDksImp0aSI6IjBmNTdmOTMyLTg5YjAtNGJjNi05YWY4LTQ2NjMwMTAwNmRjMiIsInVzZXJuYW1lIjoidGVzdCJ9.HHVUQ4MFUdppPFqjwAbSS905BM-_swJSUva2aYU0E5amVXDTBJM8eXxWTXcR23zQ1pWq5wkRxu3Y43lVsr5icRCKGo9lwvZBbMMWIjTCYHt1X2H4g7rqcQSgu1resvT5qQKRn-Pk64n5nSYTNwGV2MoRFxoZMQkFhwfOh4CTyMFSKvo7HVxUtrAA-gVOt077kVqIW2jyD0T2AyNPmzb7prjI2EeEaILn0eNgMT5eEiz9XWiKNpC8gUtWyCxkb1vWo0mOfjKpdy84zzuwRtm3WVllv9rjozudkV1cbmYTKxHBaztjaOFwHu1Z0zBuycaboUarpdLbCwRgdDd1edNhTA",
  "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Device Name/Model"
}

```



### 6. getThresholdBreakers


### Get Threshold Breakers

The `POST` request is used to retrieve threshold breakers from the API.

#### Request Body

- `authorizationToken` (text, required): The authorization token for authentication.

- `householdId` (text, required): The ID of the household.

- `threshold` (number, required): The threshold value.

- `paymentSourceId` (text, required): The ID of the payment source.

- `ipAddress` (text, required): The IP address of the device.

- `deviceDetails` (text, required): Details of the device.


#### Response

The response will be in JSON format with the following schema:

``` json
{
    "entries": [
        {
            "transactionDate": "string",
            "amount": "number",
            "runningTotal": "number"
        }
    ]
}

 ```

The response will contain an array of `entries`, where each entry will have:

- `transactionDate` (string): The date of the transaction.

- `amount` (number): The amount of the transaction.

- `runningTotal` (number): The running total at the time of the transaction.


Status Code: 200
Content Type: application/json


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getThresholdBreakers
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjgyMjliMGVlLWM0MWEtNDY3NS1hZTk4LTZiNjhjY2M4M2I4OCIsImV2ZW50X2lkIjoiMWNhMzFlNjktOGI0Zi00NWQxLTljMDQtZjMzOGNjZGNjYTVlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4Nzg2MCwiZXhwIjoxNzE2NDkxNDYwLCJpYXQiOjE3MTY0ODc4NjAsImp0aSI6IjA2YTFkMmFkLWU5NTEtNDFiMS05YWYwLTBjNjIxODA0MGIxMSIsInVzZXJuYW1lIjoidGVzdCJ9.sUHvc5nYW_couQU8GEIdcEv5LsYEWN6msbVT1sOxNQmceCvbb-9Eghe0d8BmUVFEtzbKChTfY_K-B-CobfzVOLeMm2SnAbWtQ42Bezr2U9YkAOYdf1eI7joe2N35yPhYefUZaT_k8LscRheC5A6gvfuAoEPNrVcu2HQ42sLk2ceYi8405Et6anTSSGmZ_zeY6aX1koAUfcuz_utpuEQgL_wkZwSj4SfYvUk9CovUCi9DdAtrSOfmFaoBt70n4QPtu1IQn3geIwsxmU94yJp5oCA6_vJMNekviW86MONy0bogC0MGuqo4MhHl4xki5A_kBJqm-ay5tbm-LFIhX1UaGQ",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "threshold": 500.00,
  "paymentSourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36"
}

```



### 7. getThresholdPreference


### API Request Description

This endpoint allows the client to retrieve the threshold preference by making an HTTP POST request to `api.dev.thepurplepiggybank.com/getThresholdPreference`. The request should include the following parameters in the raw request body:

- `authorizationToken` (string): The authorization token for authentication.

- `householdId` (string): The ID of the household for which the threshold preference is being retrieved.

- `ipAddress` (string): The IP address of the device making the request.

- `deviceDetails` (string): Details of the device making the request.


### API Response

The response to the request will have a status code of 200 and a content type of `application/json`. The response body will be in JSON format and will include the following schema:

``` json
{
    "threshold": ""
}

 ```

The `threshold` field in the response will contain the retrieved threshold preference.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getThresholdPreference
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjgyMjliMGVlLWM0MWEtNDY3NS1hZTk4LTZiNjhjY2M4M2I4OCIsImV2ZW50X2lkIjoiMWNhMzFlNjktOGI0Zi00NWQxLTljMDQtZjMzOGNjZGNjYTVlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4Nzg2MCwiZXhwIjoxNzE2NDkxNDYwLCJpYXQiOjE3MTY0ODc4NjAsImp0aSI6IjA2YTFkMmFkLWU5NTEtNDFiMS05YWYwLTBjNjIxODA0MGIxMSIsInVzZXJuYW1lIjoidGVzdCJ9.sUHvc5nYW_couQU8GEIdcEv5LsYEWN6msbVT1sOxNQmceCvbb-9Eghe0d8BmUVFEtzbKChTfY_K-B-CobfzVOLeMm2SnAbWtQ42Bezr2U9YkAOYdf1eI7joe2N35yPhYefUZaT_k8LscRheC5A6gvfuAoEPNrVcu2HQ42sLk2ceYi8405Et6anTSSGmZ_zeY6aX1koAUfcuz_utpuEQgL_wkZwSj4SfYvUk9CovUCi9DdAtrSOfmFaoBt70n4QPtu1IQn3geIwsxmU94yJp5oCA6_vJMNekviW86MONy0bogC0MGuqo4MhHl4xki5A_kBJqm-ay5tbm-LFIhX1UaGQ",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36"
}

```



### 8. setCurrencyPreference


### Set Currency Preference

This endpoint allows the user to set their currency preference for the Purple Piggy Bank application.

**Request Body**

- `authorizationToken` (text): The authorization token for the user.

- `householdId` (text): The ID of the user's household.

- `currencySymbol` (text): The currency symbol to set as preference.

- `ipAddress` (text): The IP address of the user's device.

- `deviceDetails` (text): Details of the user's device.


**Response**
Upon a successful request, the server responds with a status code of 200 and a JSON object containing the preference details:

``` json
{
    "preference": {
        "preferenceId": "",
        "householdId": "",
        "preferenceType": "",
        "preferenceValue": "",
        "createdAt": "",
        "updatedAt": ""
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/setCurrencyPreference
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjgwNzExM2QwLTRlOGQtNDcxZS1hNDI5LTBiZTEzZGNkNGQxOSIsImV2ZW50X2lkIjoiMjliZTk1YmYtNTYyYS00Zjk2LWI1MjgtNmM0NjFjMWYyZjlkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4NDI0OSwiZXhwIjoxNzE2NDg3ODQ5LCJpYXQiOjE3MTY0ODQyNDksImp0aSI6IjBmNTdmOTMyLTg5YjAtNGJjNi05YWY4LTQ2NjMwMTAwNmRjMiIsInVzZXJuYW1lIjoidGVzdCJ9.HHVUQ4MFUdppPFqjwAbSS905BM-_swJSUva2aYU0E5amVXDTBJM8eXxWTXcR23zQ1pWq5wkRxu3Y43lVsr5icRCKGo9lwvZBbMMWIjTCYHt1X2H4g7rqcQSgu1resvT5qQKRn-Pk64n5nSYTNwGV2MoRFxoZMQkFhwfOh4CTyMFSKvo7HVxUtrAA-gVOt077kVqIW2jyD0T2AyNPmzb7prjI2EeEaILn0eNgMT5eEiz9XWiKNpC8gUtWyCxkb1vWo0mOfjKpdy84zzuwRtm3WVllv9rjozudkV1cbmYTKxHBaztjaOFwHu1Z0zBuycaboUarpdLbCwRgdDd1edNhTA",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "currencySymbol": "$",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36"
}

```



### 9. setDefaultPaymentSource



### Set Default Payment Source

This endpoint allows the user to set a default payment source for a household.

**Request Body**
- `authorizationToken` (string): The authorization token for the request.
- `householdId` (string): The ID of the household for which the default payment source is being set.
- `paymentSourceId` (string): The ID of the payment source to be set as default.
- `ipAddress` (string): The IP address of the device making the request.
- `deviceDetails` (string): Details of the device making the request.

**Response**
The response will be in JSON format with the following schema:

```json
{
    "preference": {
        "preferenceId": "string",
        "householdId": "string",
        "preferenceType": "string",
        "preferenceValue": "string",
        "createdAt": "string",
        "updatedAt": "string"
    }
}
```



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/setDefaultPaymentSource
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6ImFjZTAxOTFhLWY1ZGYtNGFhYS1hNmMyLTQzOGQxOWJkN2QyZSIsImV2ZW50X2lkIjoiNGI5YTIzMGItNzM4YS00MGJkLTliYjQtNjlhZjM5NWMwMDBiIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4MzE0MiwiZXhwIjoxNzE2NDg2NzQyLCJpYXQiOjE3MTY0ODMxNDIsImp0aSI6IjJkMDgyY2E2LWQ4ZjMtNGMxNi04MWE5LTk2YmQxM2M2MTk1OCIsInVzZXJuYW1lIjoidGVzdCJ9.ciQtLeVSvWLa6e4-MeM0nlaXSzYYF7R47IxLfh-Phmh2or4_45O8xgxJAoTaQzgOT2TISG1g4uLRCBQ2tOTjkJ3jlp9NRG8RhG65QDux1dOv2UHasIgp-DyYFQszxcTh_qMcb90DR0tJmTg68QflvouZ1I4AZ3GBNubiQf02gWCN5ruHTyVw5UAGxd0Y2V79gR_Q3bqdbIS3MOo2RWKmy6wZtlgePAL5IKdXYG3eYZlGvUbio0K3aSWkFvmpWALu-99Ah5P8-tcArRr7b2QFm7cIi5JNqPWLH9qukO05IrT5RY8oeBKY-z_8bRYq63Rkr2tMOgtGHA37QfVdAZoFig",
  "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "paymentSourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Device Name/Model"
}
```



### 10. setThreshold


The `POST` request to `/setThreshold` endpoint is used to set a threshold for a specific household within The Purple Piggy Bank API.

### Request Body

- `authorizationToken` (string): The authorization token for the request.

- `householdId` (string): The unique identifier of the household for which the threshold is being set.

- `threshold` (number): The threshold value to be set.

- `paymentSourceId` (string): The identifier of the payment source.

- `ipAddress` (string): The IP address of the device making the request.

- `deviceDetails` (string): Details of the device making the request.


### Response

Upon successful execution, the API returns a `201` status code with a JSON response containing a `message` field.

### JSON Schema for Response

``` json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string"
    }
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/setThreshold
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjgyMjliMGVlLWM0MWEtNDY3NS1hZTk4LTZiNjhjY2M4M2I4OCIsImV2ZW50X2lkIjoiMWNhMzFlNjktOGI0Zi00NWQxLTljMDQtZjMzOGNjZGNjYTVlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ4Nzg2MCwiZXhwIjoxNzE2NDkxNDYwLCJpYXQiOjE3MTY0ODc4NjAsImp0aSI6IjA2YTFkMmFkLWU5NTEtNDFiMS05YWYwLTBjNjIxODA0MGIxMSIsInVzZXJuYW1lIjoidGVzdCJ9.sUHvc5nYW_couQU8GEIdcEv5LsYEWN6msbVT1sOxNQmceCvbb-9Eghe0d8BmUVFEtzbKChTfY_K-B-CobfzVOLeMm2SnAbWtQ42Bezr2U9YkAOYdf1eI7joe2N35yPhYefUZaT_k8LscRheC5A6gvfuAoEPNrVcu2HQ42sLk2ceYi8405Et6anTSSGmZ_zeY6aX1koAUfcuz_utpuEQgL_wkZwSj4SfYvUk9CovUCi9DdAtrSOfmFaoBt70n4QPtu1IQn3geIwsxmU94yJp5oCA6_vJMNekviW86MONy0bogC0MGuqo4MhHl4xki5A_kBJqm-ay5tbm-LFIhX1UaGQ",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "threshold": 500.00,
  "paymentSourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36"
}

```



## Reporting



### 1. exportLedgerToCsv


### Export Ledger to CSV

This endpoint allows you to export the ledger to a CSV file.

#### Request Body

- `authorizationToken` (string, required): The authorization token for accessing the API.

- `householdId` (string, required): The ID of the household for which the ledger is to be exported.

- `paymentSourceId` (string, required): The ID of the payment source.

- `ipAddress` (string, required): The IP address of the device making the request.

- `deviceDetails` (string, required): Details of the device making the request.


#### Response

The response is in JSON format with the following schema:

``` json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        },
        "presignedUrl": {
            "type": "string"
        }
    }
}

 ```

- `message` (string): A message related to the export process.

- `presignedUrl` (string): The presigned URL for downloading the exported CSV file.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/exportLedgerToCsv
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjQ1Zjk4YTM5LTc1OTMtNDA5NC1hNjQ0LTFkZjA2Zjc0ODMwNCIsImV2ZW50X2lkIjoiZTBmMjBiN2YtMzIyYS00MjI4LWExOTEtMDk5MTQ4MWI1MmU2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ5MDgwNywiZXhwIjoxNzE2NDk0NDA3LCJpYXQiOjE3MTY0OTA4MDcsImp0aSI6ImFkYjVmMTllLTZlNzYtNGVmOS04OGRmLTM2YmVmZTE1MDU3OCIsInVzZXJuYW1lIjoidGVzdCJ9.ErmuIRD3BBVCDrKKhThgfCKKKnmyj4IiX7M8WnhdQR_ttHWjH0uNb3vOk1TfHL4ScQaQmg_iSj24lACwKgimsO1LoVLq5TDLhIV8iLtAx794LovPJQshJ4EtaDXzh8iB9Cv8qq-jmWtec0EMrxwzrpfX5ogCuicMwoGLGRK9yekV4nMfg3I6VfuVSO2oMtHOw-ATlDHyTLMp-bCPYEFUEjTa5TXBpqhBrBqpH8a9iYi6Cog5fe9fC7306iWOpDAUTnXomOU-dXnPj0R-Gvz4gxuk18lhydE9e6x0uBZfazJdFPS-UxHQiuIuUxq1v1lwO64FD8Re-t7kDl9tZJD7rg",
    "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
    "paymentSourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Device details here"
}
```



### 2. exportLedgerToQBO


The `POST /exportLedgerToQBO` endpoint is used to export the ledger to QuickBooks Online.

### Request Body

- `authorizationToken` (string): The authorization token for authentication.

- `householdId` (string): The ID of the household for which the ledger is being exported.

- `paymentSourceId` (string): The ID of the payment source.

- `ipAddress` (string): The IP address of the device initiating the request.

- `deviceDetails` (string): Details of the device initiating the request.


### Response

The response is a JSON object with the following properties:

- `message` (string): A message indicating the result of the export process.

- `presignedUrl` (string): The presigned URL for downloading the exported ledger file.


### JSON Schema

``` json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        },
        "presignedUrl": {
            "type": "string"
        }
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/exportLedgerToQBO
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjQ1Zjk4YTM5LTc1OTMtNDA5NC1hNjQ0LTFkZjA2Zjc0ODMwNCIsImV2ZW50X2lkIjoiZTBmMjBiN2YtMzIyYS00MjI4LWExOTEtMDk5MTQ4MWI1MmU2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ5MDgwNywiZXhwIjoxNzE2NDk0NDA3LCJpYXQiOjE3MTY0OTA4MDcsImp0aSI6ImFkYjVmMTllLTZlNzYtNGVmOS04OGRmLTM2YmVmZTE1MDU3OCIsInVzZXJuYW1lIjoidGVzdCJ9.ErmuIRD3BBVCDrKKhThgfCKKKnmyj4IiX7M8WnhdQR_ttHWjH0uNb3vOk1TfHL4ScQaQmg_iSj24lACwKgimsO1LoVLq5TDLhIV8iLtAx794LovPJQshJ4EtaDXzh8iB9Cv8qq-jmWtec0EMrxwzrpfX5ogCuicMwoGLGRK9yekV4nMfg3I6VfuVSO2oMtHOw-ATlDHyTLMp-bCPYEFUEjTa5TXBpqhBrBqpH8a9iYi6Cog5fe9fC7306iWOpDAUTnXomOU-dXnPj0R-Gvz4gxuk18lhydE9e6x0uBZfazJdFPS-UxHQiuIuUxq1v1lwO64FD8Re-t7kDl9tZJD7rg",
    "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
    "paymentSourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Device details here"
}
```



### 3. getCategories



This endpoint makes an HTTP POST request to `api.dev.thepurplepiggybank.com/getCategories` to retrieve category spend information. The request should include an `authorizationToken`, `householdId`, `month`, `year`, `ipAddress`, and `deviceDetails` in the payload.

### Response
The response will have a status code of 200 and a content type of `application/json`. The response body will be in the following JSON schema format:

```json
{
    "type": "object",
    "properties": {
        "monthSpend": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string"
                    },
                    "amount": {
                        "type": "number"
                    }
                }
            }
        },
        "yearToDateSpend": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string"
                    },
                    "amount": {
                        "type": "number"
                    }
                }
            }
        }
    }
}
```

This schema describes the structure of the response body, indicating that it will contain `monthSpend` and `yearToDateSpend` arrays, each with objects containing `category` and `amount` properties.



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getCategories
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjQ1Zjk4YTM5LTc1OTMtNDA5NC1hNjQ0LTFkZjA2Zjc0ODMwNCIsImV2ZW50X2lkIjoiZTBmMjBiN2YtMzIyYS00MjI4LWExOTEtMDk5MTQ4MWI1MmU2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ5MDgwNywiZXhwIjoxNzE2NDk0NDA3LCJpYXQiOjE3MTY0OTA4MDcsImp0aSI6ImFkYjVmMTllLTZlNzYtNGVmOS04OGRmLTM2YmVmZTE1MDU3OCIsInVzZXJuYW1lIjoidGVzdCJ9.ErmuIRD3BBVCDrKKhThgfCKKKnmyj4IiX7M8WnhdQR_ttHWjH0uNb3vOk1TfHL4ScQaQmg_iSj24lACwKgimsO1LoVLq5TDLhIV8iLtAx794LovPJQshJ4EtaDXzh8iB9Cv8qq-jmWtec0EMrxwzrpfX5ogCuicMwoGLGRK9yekV4nMfg3I6VfuVSO2oMtHOw-ATlDHyTLMp-bCPYEFUEjTa5TXBpqhBrBqpH8a9iYi6Cog5fe9fC7306iWOpDAUTnXomOU-dXnPj0R-Gvz4gxuk18lhydE9e6x0uBZfazJdFPS-UxHQiuIuUxq1v1lwO64FD8Re-t7kDl9tZJD7rg",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "month": 5,
  "year": 2024,
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Device details here"
}

```



### 4. getLedger



### API Request Description
This API endpoint allows users to retrieve ledger entries for a specific household.

### Response
The response for this request is a JSON object with a key "ledgerEntries" containing an array of ledger entry objects. Each ledger entry object includes the following properties:
- `ledgerId` (string): The unique identifier for the ledger entry.
- `householdId` (string): The identifier for the household associated with the ledger entry.
- `paymentSourceId` (string): The identifier for the payment source used for the transaction.
- `amount` (number): The amount of the transaction.
- `transactionType` (string): The type of transaction (e.g., debit, credit).
- `transactionDate` (string): The date of the transaction.
- `category` (string): The category of the transaction.
- `description` (string): A description of the transaction.
- `status` (boolean): The status of the transaction.
- `createdAt` (string): The date and time when the ledger entry was created.
- `updatedAt` (string): The date and time when the ledger entry was last updated.
- `updatedBy` (string): The user who last updated the ledger entry.
- `billId` (string or null): The identifier for the bill associated with the transaction, if applicable.
- `incomeId` (string or null): The identifier for the income associated with the transaction, if applicable.
- `runningTotal` (number): The running total of the ledger entries.
- `interestRate` (number or null): The interest rate associated with the transaction, if applicable.
- `cashBack` (number or null): The cash back amount associated with the transaction, if applicable.
- `tags` (array or null): An array of tags associated with the transaction.
- `bill` (object or null): Details of the bill associated with the transaction, if applicable.
- `income` (object or null): Details of the income associated with the transaction, if applicable.
- `transactions` (array): An array of sub-transactions associated with the ledger entry.

### JSON Schema
```json
{
    "type": "object",
    "properties": {
        "ledgerEntries": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ledgerId": {"type": "string"},
                    "householdId": {"type": "string"},
                    "paymentSourceId": {"type": "string"},
                    "amount": {"type": "number"},
                    "transactionType": {"type": "string"},
                    "transactionDate": {"type": "string"},
                    "category": {"type": "string"},
                    "description": {"type": "string"},
                    "status": {"type": "boolean"},
                    "createdAt": {"type": "string"},
                    "updatedAt": {"type": "string"},
                    "updatedBy": {"type": "string"},
                    "billId": {"type": ["string", "null"]},
                    "incomeId": {"type": ["string", "null"]},
                    "runningTotal": {"type": "number"},
                    "interestRate": {"type": ["number", "null"]},
                    "cashBack": {"type": ["number", "null"]},
                    "tags": {"type": ["array", "null"]},
                    "bill": {"type": ["object", "null"]},
                    "income": {"type": ["object", "null"]},
                    "transactions": {"type": "array"}
                },
                "required": ["ledgerId", "householdId", "amount", "transactionType", "transactionDate", "status", "createdAt", "updatedAt", "updatedBy", "runningTotal", "transactions"]
            }
        }
    },
    "required": ["ledgerEntries"]
}
```



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getLedger
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjQ1Zjk4YTM5LTc1OTMtNDA5NC1hNjQ0LTFkZjA2Zjc0ODMwNCIsImV2ZW50X2lkIjoiZTBmMjBiN2YtMzIyYS00MjI4LWExOTEtMDk5MTQ4MWI1MmU2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ5MDgwNywiZXhwIjoxNzE2NDk0NDA3LCJpYXQiOjE3MTY0OTA4MDcsImp0aSI6ImFkYjVmMTllLTZlNzYtNGVmOS04OGRmLTM2YmVmZTE1MDU3OCIsInVzZXJuYW1lIjoidGVzdCJ9.ErmuIRD3BBVCDrKKhThgfCKKKnmyj4IiX7M8WnhdQR_ttHWjH0uNb3vOk1TfHL4ScQaQmg_iSj24lACwKgimsO1LoVLq5TDLhIV8iLtAx794LovPJQshJ4EtaDXzh8iB9Cv8qq-jmWtec0EMrxwzrpfX5ogCuicMwoGLGRK9yekV4nMfg3I6VfuVSO2oMtHOw-ATlDHyTLMp-bCPYEFUEjTa5TXBpqhBrBqpH8a9iYi6Cog5fe9fC7306iWOpDAUTnXomOU-dXnPj0R-Gvz4gxuk18lhydE9e6x0uBZfazJdFPS-UxHQiuIuUxq1v1lwO64FD8Re-t7kDl9tZJD7rg",
    "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "month": 5,
  "year": 2024,
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Device details here"
}
```



### 5. getRunningTotal


### GET RUNNING TOTAL

This endpoint is used to retrieve the running total with the provided authorization token, payment source ID, IP address, and device details.

#### Request Body

- `authorizationToken` (string): The authorization token for authentication.

- `paymentSourceId` (string): The ID of the payment source.

- `ipAddress` (string): The IP address of the device.

- `deviceDetails` (string): Details of the device.


#### Response

The response is returned in JSON format with the following schema:

``` json
{
    "paymentSourceId": "string",
    "runningTotal": 0
}

 ```

- `paymentSourceId` (string): The ID of the payment source.

- `runningTotal` (number): The current running total.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getRunningTotal
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjQ1Zjk4YTM5LTc1OTMtNDA5NC1hNjQ0LTFkZjA2Zjc0ODMwNCIsImV2ZW50X2lkIjoiZTBmMjBiN2YtMzIyYS00MjI4LWExOTEtMDk5MTQ4MWI1MmU2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ5MDgwNywiZXhwIjoxNzE2NDk0NDA3LCJpYXQiOjE3MTY0OTA4MDcsImp0aSI6ImFkYjVmMTllLTZlNzYtNGVmOS04OGRmLTM2YmVmZTE1MDU3OCIsInVzZXJuYW1lIjoidGVzdCJ9.ErmuIRD3BBVCDrKKhThgfCKKKnmyj4IiX7M8WnhdQR_ttHWjH0uNb3vOk1TfHL4ScQaQmg_iSj24lACwKgimsO1LoVLq5TDLhIV8iLtAx794LovPJQshJ4EtaDXzh8iB9Cv8qq-jmWtec0EMrxwzrpfX5ogCuicMwoGLGRK9yekV4nMfg3I6VfuVSO2oMtHOw-ATlDHyTLMp-bCPYEFUEjTa5TXBpqhBrBqpH8a9iYi6Cog5fe9fC7306iWOpDAUTnXomOU-dXnPj0R-Gvz4gxuk18lhydE9e6x0uBZfazJdFPS-UxHQiuIuUxq1v1lwO64FD8Re-t7kDl9tZJD7rg",
    "paymentSourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
```



### 6. getRunningTotalsByDate


### Get Running Totals By Date

This endpoint allows you to retrieve running totals by date.

**HTTP Request**
`POST api.dev.thepurplepiggybank.com/getRunningTotalsByDate`

**Request Body**

- `authorizationToken` (text, required): The authorization token for access.

- `paymentSourceId` (text, required): The payment source ID.

- `month` (number, required): The month for which running totals are to be retrieved.

- `year` (number, required): The year for which running totals are to be retrieved.

- `ipAddress` (text, required): The IP address of the device.

- `deviceDetails` (text, required): Details of the device.


**Response**

``` json
{
    "paymentSourceId": "",
    "ledgerEntries": [
        {
            "transactionDate": "",
            "runningTotal": 0
        }
    ]
}

 ```

**Response JSON Schema**

``` json
{
    "type": "object",
    "properties": {
        "paymentSourceId": {
            "type": "string"
        },
        "ledgerEntries": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "transactionDate": {
                        "type": "string"
                    },
                    "runningTotal": {
                        "type": "number"
                    }
                }
            }
        }
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getRunningTotalsByDate
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | multipart/form-data |  |



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjQ1Zjk4YTM5LTc1OTMtNDA5NC1hNjQ0LTFkZjA2Zjc0ODMwNCIsImV2ZW50X2lkIjoiZTBmMjBiN2YtMzIyYS00MjI4LWExOTEtMDk5MTQ4MWI1MmU2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ5MDgwNywiZXhwIjoxNzE2NDk0NDA3LCJpYXQiOjE3MTY0OTA4MDcsImp0aSI6ImFkYjVmMTllLTZlNzYtNGVmOS04OGRmLTM2YmVmZTE1MDU3OCIsInVzZXJuYW1lIjoidGVzdCJ9.ErmuIRD3BBVCDrKKhThgfCKKKnmyj4IiX7M8WnhdQR_ttHWjH0uNb3vOk1TfHL4ScQaQmg_iSj24lACwKgimsO1LoVLq5TDLhIV8iLtAx794LovPJQshJ4EtaDXzh8iB9Cv8qq-jmWtec0EMrxwzrpfX5ogCuicMwoGLGRK9yekV4nMfg3I6VfuVSO2oMtHOw-ATlDHyTLMp-bCPYEFUEjTa5TXBpqhBrBqpH8a9iYi6Cog5fe9fC7306iWOpDAUTnXomOU-dXnPj0R-Gvz4gxuk18lhydE9e6x0uBZfazJdFPS-UxHQiuIuUxq1v1lwO64FD8Re-t7kDl9tZJD7rg",
  "paymentSourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2",
  "month": 5,
  "year": 2024,
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36"
}

```



## Security



### 1. getAuditTrail


### Get Audit Trail

The `Get Audit Trail` endpoint is used to retrieve the audit trail data from the Purple Piggy Bank API.

**Request Body**

- `authorizationToken` (string, required): The authorization token for accessing the audit trail data.

- `page` (number, required): The page number for paginating the audit trail data.

- `pageSize` (number, required): The number of items to be included in each page of the audit trail data.

- `ipAddress` (string, optional): The IP address for filtering the audit trail data.

- `deviceDetails` (string, optional): Details of the device for filtering the audit trail data.


**Response**
The response of this request is a JSON schema representing the structure of the audit trail data.

Example:

``` json
{
  "type": "object",
  "properties": {
    "auditTrailData": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": {
            "type": "string"
          },
          "action": {
            "type": "string"
          },
          "user": {
            "type": "string"
          },
          "details": {
            "type": "string"
          }
        }
      }
    }
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getAuditTrail
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjNhNDNmZDcwLWUwNGItNDgxZS1iZjhjLWFjYmYyMzUwMDdmZiIsImV2ZW50X2lkIjoiYTRmNGUxMGItNWYwZS00NzYzLThmM2YtMTM0YzVhNzU3YzJmIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQwODA1OSwiZXhwIjoxNzE2NDExNjU5LCJpYXQiOjE3MTY0MDgwNTksImp0aSI6ImVjNDg1YTQ5LTZjMGItNGQ3OS04YWZkLTkzYjhmMWM5ZWUzYiIsInVzZXJuYW1lIjoidGVzdCJ9.MMwur4DlEBJK1-CjLLirb-uc1-W1_SklGmEf3C22Q5XL4w8VfRZ122xIZfMCTHIkzbeFZ9UMX7SzV1wSQev8VoaAaoe0tTGMWqPp3AUUs1oaAulH9-ZC9UJ-8ap_mC_Ny1gohZYd5JkOqu-VMY8VKHIikbhIiZSJ54UMh3pbKOveLJZJGIUYMfscvFWu4BA0HQJhw3GalbhXrA3U7Zx4I7UvniqNTA3f7kfG-ECCkZLTacP1q4VXcXmKmPQCfQ8R3JUa_ALZ5mpHswiBkif4Sp8i_1o8jHlPQYB7zCUQlmHMEf--qUr0clieFahKmrpkFfMR_TAq_5g1b01l0gQRgQ",
  "page": 1,
  "pageSize": 10,
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Device Name/Model"
}

```



### 2. getSecurityLog


The `POST` request to `/getSecurityLog` endpoint is used to retrieve security log information from the Purple Piggy Bank API.

### Request Body

The request should include the following parameters in the raw request body format:

- `authorizationToken` (string): The authorization token for authentication.

- `page` (number): The page number for paginated results.

- `pageSize` (number): The number of items per page.

- `ipAddress` (string): The IP address for filtering security logs.

- `deviceDetails` (string): Details of the device for filtering security logs.


### Response

The response of this request is a JSON schema representing the structure of the security log data.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getSecurityLog
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjNhNDNmZDcwLWUwNGItNDgxZS1iZjhjLWFjYmYyMzUwMDdmZiIsImV2ZW50X2lkIjoiYTRmNGUxMGItNWYwZS00NzYzLThmM2YtMTM0YzVhNzU3YzJmIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQwODA1OSwiZXhwIjoxNzE2NDExNjU5LCJpYXQiOjE3MTY0MDgwNTksImp0aSI6ImVjNDg1YTQ5LTZjMGItNGQ3OS04YWZkLTkzYjhmMWM5ZWUzYiIsInVzZXJuYW1lIjoidGVzdCJ9.MMwur4DlEBJK1-CjLLirb-uc1-W1_SklGmEf3C22Q5XL4w8VfRZ122xIZfMCTHIkzbeFZ9UMX7SzV1wSQev8VoaAaoe0tTGMWqPp3AUUs1oaAulH9-ZC9UJ-8ap_mC_Ny1gohZYd5JkOqu-VMY8VKHIikbhIiZSJ54UMh3pbKOveLJZJGIUYMfscvFWu4BA0HQJhw3GalbhXrA3U7Zx4I7UvniqNTA3f7kfG-ECCkZLTacP1q4VXcXmKmPQCfQ8R3JUa_ALZ5mpHswiBkif4Sp8i_1o8jHlPQYB7zCUQlmHMEf--qUr0clieFahKmrpkFfMR_TAq_5g1b01l0gQRgQ",
  "page": 1,
  "pageSize": 10,
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Device Name/Model"
}
```



## Transactions



### 1. addTransaction


## Add Transaction

This endpoint allows you to add a new transaction to the Purple Piggy Bank.

### Request Body

- `authorizationToken` (string, required): The authorization token for the request.

- `householdId` (string, required): The ID of the household for the transaction.

- `amount` (string, required): The amount of the transaction.

- `transactionType` (string, required): The type of the transaction.

- `transactionDate` (string, required): The date of the transaction.

- `category` (string, required): The category of the transaction.

- `description` (string, required): The description of the transaction.

- `ipAddress` (string, required): The IP address of the device.

- `deviceDetails` (string, required): Details of the device used for the transaction.

- `status` (string, required): The status of the transaction.

- `sourceId` (string, required): The ID of the source of the transaction.

- `tags` (string, required): Tags associated with the transaction.


### Response (201 - Created)

``` json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        },
        "transaction": {
            "type": "object",
            "properties": {
                "transactionId": {
                    "type": "string"
                },
                "ledgerId": {
                    "type": "string"
                },
                "sourceId": {
                    "type": "string"
                },
                "amount": {
                    "type": "number"
                },
                "transactionDate": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "createdAt": {
                    "type": "string"
                },
                "updatedAt": {
                    "type": "string"
                }
            }
        }
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/addTransaction
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | application/json |  |



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjQ1Zjk4YTM5LTc1OTMtNDA5NC1hNjQ0LTFkZjA2Zjc0ODMwNCIsImV2ZW50X2lkIjoiZTBmMjBiN2YtMzIyYS00MjI4LWExOTEtMDk5MTQ4MWI1MmU2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ5MDgwNywiZXhwIjoxNzE2NDk0NDA3LCJpYXQiOjE3MTY0OTA4MDcsImp0aSI6ImFkYjVmMTllLTZlNzYtNGVmOS04OGRmLTM2YmVmZTE1MDU3OCIsInVzZXJuYW1lIjoidGVzdCJ9.ErmuIRD3BBVCDrKKhThgfCKKKnmyj4IiX7M8WnhdQR_ttHWjH0uNb3vOk1TfHL4ScQaQmg_iSj24lACwKgimsO1LoVLq5TDLhIV8iLtAx794LovPJQshJ4EtaDXzh8iB9Cv8qq-jmWtec0EMrxwzrpfX5ogCuicMwoGLGRK9yekV4nMfg3I6VfuVSO2oMtHOw-ATlDHyTLMp-bCPYEFUEjTa5TXBpqhBrBqpH8a9iYi6Cog5fe9fC7306iWOpDAUTnXomOU-dXnPj0R-Gvz4gxuk18lhydE9e6x0uBZfazJdFPS-UxHQiuIuUxq1v1lwO64FD8Re-t7kDl9tZJD7rg",
   "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "amount": "100.00",
  "transactionType": "debit",
  "transactionDate": "2024-05-23T00:00:00Z",
  "category": "Groceries",
  "description": "Weekly groceries",
  "ipAddress": "127.0.0.1",
  "deviceDetails": "Device details here",
  "status": "true",
  "sourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2",
  "tags": "tag1,tag2"
}

```



### 2. editTransaction


The `POST` request to `/addTransaction` endpoint is used to add a new transaction to the Purple Piggy Bank API. The request should include the following parameters in the raw request body:

- `transactionId` (string): The unique identifier for the transaction.

- `authorizationToken` (string): The authorization token for the transaction.

- `householdId` (string): The identifier for the household associated with the transaction.

- `amount` (string): The amount of the transaction.

- `transactionType` (string): The type of transaction (e.g., income, expense).

- `transactionDate` (string): The date of the transaction.

- `category` (string): The category of the transaction.

- `description` (string): The description of the transaction.

- `ipAddress` (string): The IP address associated with the transaction.

- `deviceDetails` (string): The details of the device used for the transaction.

- `status` (string): The status of the transaction.

- `sourceId` (string): The source identifier for the transaction.

- `tags` (string): Any tags associated with the transaction.

- `image` (string): The image associated with the transaction.


The response of this request is documented as a JSON schema:

``` json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string"
    },
    "message": {
      "type": "string"
    },
    "transactionId": {
      "type": "string"
    }
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/addTransaction
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | application/json |  |



***Body:***

```js
{
  "transactionId": "82b4322b-f8cc-4338-b0f2-0687c3e46f32",
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjVlNDUwMzYyLWQzMDEtNDg2OC1iZGI4LWIwZTg4NDVmYTk3NiIsImV2ZW50X2lkIjoiZjE3OWUzYTUtODJlMC00Y2Q3LTgzNmYtZmVlYTAyMTU3MTNlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ3OTQwOSwiZXhwIjoxNzE2NDgzMDA5LCJpYXQiOjE3MTY0Nzk0MDksImp0aSI6IjQ3YWIxMGExLTRmYWMtNGU5Ny05ZmY5LTc0MmUzNzRiYzM0MyIsInVzZXJuYW1lIjoidGVzdCJ9.ETH0xnTgQctwovD0_AMwhdMrbCGZTgTXSipSDJqm29AJUCHstHzmwHU88kRb-NlqCJKgrD5m89ju-3MW8HJ1SY02yQQgUNv9Xf3O98Ih1eAPZHgcHqBVaRuDHEtD4QiBtlZO0edgzqWbIWPv9RH0lOaBvdSCVHcXiRHIQghZ9U9LneBmTuf_kUNzVBtR4dFy-eXIa83BpP3a3mKEhfBPMjThtgdhV0oKitZMQGtidGQfTnsxgYEpJHN64MRyu2HyVuXQ2h7or2PzMGpmPRWmq9kew64XGR0Uufni2NZAaXSjcZ1Ll1P-McOO3LKuLJqzZau5Et2U1BM3iL-zKqBEvg",
  "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
  "amount": "999.00",
  "transactionType": "debit",
  "transactionDate": "2024-05-23T00:00:00Z",
  "category": "Groceries",
  "description": "Weekly groceries",
  "ipAddress": "127.0.0.1",
  "deviceDetails": "Device details here",
  "status": "true",
  "sourceId": "414690b8-9678-4dbf-9851-bee2a080d7f2",
  "tags": "tag1,tag2",
  "image": "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"
}

```



### 3. getFilePath


### Get File Path

The `POST` request is used to retrieve the file path from the API.

#### Request Body

- `authorizationToken` (string, required): The authorization token for authentication.

- `transactionId` (string, required): The transaction ID for identifying the specific transaction.


#### Response (JSON Schema)

``` json
{
  "type": "object",
  "properties": {
    "filePath": {
      "type": "string"
    }
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getFilePath
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | application/json |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjVlNDUwMzYyLWQzMDEtNDg2OC1iZGI4LWIwZTg4NDVmYTk3NiIsImV2ZW50X2lkIjoiZjE3OWUzYTUtODJlMC00Y2Q3LTgzNmYtZmVlYTAyMTU3MTNlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ3OTQwOSwiZXhwIjoxNzE2NDgzMDA5LCJpYXQiOjE3MTY0Nzk0MDksImp0aSI6IjQ3YWIxMGExLTRmYWMtNGU5Ny05ZmY5LTc0MmUzNzRiYzM0MyIsInVzZXJuYW1lIjoidGVzdCJ9.ETH0xnTgQctwovD0_AMwhdMrbCGZTgTXSipSDJqm29AJUCHstHzmwHU88kRb-NlqCJKgrD5m89ju-3MW8HJ1SY02yQQgUNv9Xf3O98Ih1eAPZHgcHqBVaRuDHEtD4QiBtlZO0edgzqWbIWPv9RH0lOaBvdSCVHcXiRHIQghZ9U9LneBmTuf_kUNzVBtR4dFy-eXIa83BpP3a3mKEhfBPMjThtgdhV0oKitZMQGtidGQfTnsxgYEpJHN64MRyu2HyVuXQ2h7or2PzMGpmPRWmq9kew64XGR0Uufni2NZAaXSjcZ1Ll1P-McOO3LKuLJqzZau5Et2U1BM3iL-zKqBEvg",
    "transactionId": "7ce8d661-cbd9-479f-8756-107c56937270"
}
```



### 4. getTransaction


### Get Transaction

This endpoint is used to retrieve transaction details.

#### Request Body

- `authorizationToken` (string): The authorization token for the transaction.

- `transactionId` (string): The ID of the transaction to retrieve.

- `ipAddress` (string): The IP address associated with the transaction.

- `deviceDetails` (string): Details of the device used for the transaction.


#### Response

The response for this request follows the JSON schema below:

``` json
{
  "type": "object",
  "properties": {
    "transactionId": {
      "type": "string"
    },
    "amount": {
      "type": "number"
    },
    "currency": {
      "type": "string"
    },
    "status": {
      "type": "string"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getTransaction
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | application/json |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjVlNDUwMzYyLWQzMDEtNDg2OC1iZGI4LWIwZTg4NDVmYTk3NiIsImV2ZW50X2lkIjoiZjE3OWUzYTUtODJlMC00Y2Q3LTgzNmYtZmVlYTAyMTU3MTNlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ3OTQwOSwiZXhwIjoxNzE2NDgzMDA5LCJpYXQiOjE3MTY0Nzk0MDksImp0aSI6IjQ3YWIxMGExLTRmYWMtNGU5Ny05ZmY5LTc0MmUzNzRiYzM0MyIsInVzZXJuYW1lIjoidGVzdCJ9.ETH0xnTgQctwovD0_AMwhdMrbCGZTgTXSipSDJqm29AJUCHstHzmwHU88kRb-NlqCJKgrD5m89ju-3MW8HJ1SY02yQQgUNv9Xf3O98Ih1eAPZHgcHqBVaRuDHEtD4QiBtlZO0edgzqWbIWPv9RH0lOaBvdSCVHcXiRHIQghZ9U9LneBmTuf_kUNzVBtR4dFy-eXIa83BpP3a3mKEhfBPMjThtgdhV0oKitZMQGtidGQfTnsxgYEpJHN64MRyu2HyVuXQ2h7or2PzMGpmPRWmq9kew64XGR0Uufni2NZAaXSjcZ1Ll1P-McOO3LKuLJqzZau5Et2U1BM3iL-zKqBEvg",
    "transactionId": "7ce8d661-cbd9-479f-8756-107c56937270",
  "ipAddress": "192.168.1.1",
	"deviceDetails": "iPhone 12, iOS 14.4"
}
```



### 5. getTransactionByMonth



This endpoint allows you to make an HTTP POST request to api.dev.thepurplepiggybank.com/getTransactionsByMonth in order to retrieve transactions for a specific month. The request should include the authorization token, transaction ID, IP address, device details, month, and year in the payload.

### Request Body
- authorizationToken (string, required): The authorization token for accessing the API.
- transactionId (string, required): The ID of the transaction.
- ipAddress (string, required): The IP address of the device.
- deviceDetails (string, required): Details of the device used for the transaction.
- month (integer, required): The month for which transactions are to be retrieved.
- year (integer, required): The year for which transactions are to be retrieved.

### Response (JSON Schema)
The response of this request is expected to be a JSON object with specific properties. The JSON schema for the response will be documented here.



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getTransactionsByMonth
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | application/json |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjVlNDUwMzYyLWQzMDEtNDg2OC1iZGI4LWIwZTg4NDVmYTk3NiIsImV2ZW50X2lkIjoiZjE3OWUzYTUtODJlMC00Y2Q3LTgzNmYtZmVlYTAyMTU3MTNlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ3OTQwOSwiZXhwIjoxNzE2NDgzMDA5LCJpYXQiOjE3MTY0Nzk0MDksImp0aSI6IjQ3YWIxMGExLTRmYWMtNGU5Ny05ZmY5LTc0MmUzNzRiYzM0MyIsInVzZXJuYW1lIjoidGVzdCJ9.ETH0xnTgQctwovD0_AMwhdMrbCGZTgTXSipSDJqm29AJUCHstHzmwHU88kRb-NlqCJKgrD5m89ju-3MW8HJ1SY02yQQgUNv9Xf3O98Ih1eAPZHgcHqBVaRuDHEtD4QiBtlZO0edgzqWbIWPv9RH0lOaBvdSCVHcXiRHIQghZ9U9LneBmTuf_kUNzVBtR4dFy-eXIa83BpP3a3mKEhfBPMjThtgdhV0oKitZMQGtidGQfTnsxgYEpJHN64MRyu2HyVuXQ2h7or2PzMGpmPRWmq9kew64XGR0Uufni2NZAaXSjcZ1Ll1P-McOO3LKuLJqzZau5Et2U1BM3iL-zKqBEvg",
    "transactionId": "7ce8d661-cbd9-479f-8756-107c56937270",
  "ipAddress": "192.168.1.1",
	"deviceDetails": "iPhone 12, iOS 14.4",
	"month": 5,
	"year": 2024
}
```



### 6. getTransactionsByPaymentSource


### Get Transactions by Payment Source

This API endpoint is used to retrieve transactions based on the payment source.

**Request Body**

- authorizationToken (string, required): The authorization token for authentication.

- householdId (string, required): The ID of the household for which transactions are being retrieved.

- paymentSourceId (string, required): The ID of the payment source for which transactions are being retrieved.

- ipAddress (string, required): The IP address of the device making the request.

- deviceDetails (string, required): Details of the device making the request.


**Response**
The response of this request is a JSON object conforming to the following schema:

``` json
{
  "type": "object",
  "properties": {
    "transactions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "transactionId": {
            "type": "string"
          },
          "amount": {
            "type": "number"
          },
          "date": {
            "type": "string",
            "format": "date-time"
          },
          "description": {
            "type": "string"
          }
        }
      }
    }
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getTransactionsByPaymentSource
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | application/json |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjVlNDUwMzYyLWQzMDEtNDg2OC1iZGI4LWIwZTg4NDVmYTk3NiIsImV2ZW50X2lkIjoiZjE3OWUzYTUtODJlMC00Y2Q3LTgzNmYtZmVlYTAyMTU3MTNlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ3OTQwOSwiZXhwIjoxNzE2NDgzMDA5LCJpYXQiOjE3MTY0Nzk0MDksImp0aSI6IjQ3YWIxMGExLTRmYWMtNGU5Ny05ZmY5LTc0MmUzNzRiYzM0MyIsInVzZXJuYW1lIjoidGVzdCJ9.ETH0xnTgQctwovD0_AMwhdMrbCGZTgTXSipSDJqm29AJUCHstHzmwHU88kRb-NlqCJKgrD5m89ju-3MW8HJ1SY02yQQgUNv9Xf3O98Ih1eAPZHgcHqBVaRuDHEtD4QiBtlZO0edgzqWbIWPv9RH0lOaBvdSCVHcXiRHIQghZ9U9LneBmTuf_kUNzVBtR4dFy-eXIa83BpP3a3mKEhfBPMjThtgdhV0oKitZMQGtidGQfTnsxgYEpJHN64MRyu2HyVuXQ2h7or2PzMGpmPRWmq9kew64XGR0Uufni2NZAaXSjcZ1Ll1P-McOO3LKuLJqzZau5Et2U1BM3iL-zKqBEvg",
    "householdId": "21d2a18d-0f98-485b-90d2-552988f190b8",
		"paymentSourceId":"414690b8-9678-4dbf-9851-bee2a080d7f2",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
```



### 7. searchTransactions


### Search Transactions

This endpoint allows you to search for transactions.

#### Request Body

- `authorizationToken` (string, required): The authorization token for the request.

- `query` (string, required): The query string for the transaction search.

- `ipAddress` (string, required): The IP address of the device making the request.

- `deviceDetails` (string, required): Details of the device making the request.


#### Response

The response for this request follows the JSON schema below:

``` json
{
  "type": "object",
  "properties": {
    "transactions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "transactionId": {
            "type": "string"
          },
          "amount": {
            "type": "number"
          },
          "currency": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          }
        }
      }
    }
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/searchTransactions
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | application/json |  |



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDA4NDQxOC1kMDkxLTcwZmEtMzYzMC0yNzM4YTIwYzA0ZjkiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjVlNDUwMzYyLWQzMDEtNDg2OC1iZGI4LWIwZTg4NDVmYTk3NiIsImV2ZW50X2lkIjoiZjE3OWUzYTUtODJlMC00Y2Q3LTgzNmYtZmVlYTAyMTU3MTNlIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjQ3OTQwOSwiZXhwIjoxNzE2NDgzMDA5LCJpYXQiOjE3MTY0Nzk0MDksImp0aSI6IjQ3YWIxMGExLTRmYWMtNGU5Ny05ZmY5LTc0MmUzNzRiYzM0MyIsInVzZXJuYW1lIjoidGVzdCJ9.ETH0xnTgQctwovD0_AMwhdMrbCGZTgTXSipSDJqm29AJUCHstHzmwHU88kRb-NlqCJKgrD5m89ju-3MW8HJ1SY02yQQgUNv9Xf3O98Ih1eAPZHgcHqBVaRuDHEtD4QiBtlZO0edgzqWbIWPv9RH0lOaBvdSCVHcXiRHIQghZ9U9LneBmTuf_kUNzVBtR4dFy-eXIa83BpP3a3mKEhfBPMjThtgdhV0oKitZMQGtidGQfTnsxgYEpJHN64MRyu2HyVuXQ2h7or2PzMGpmPRWmq9kew64XGR0Uufni2NZAaXSjcZ1Ll1P-McOO3LKuLJqzZau5Et2U1BM3iL-zKqBEvg",
  "query": "0.01",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Device details here"
}

```



## User



### 1. addUser



The `POST` request to `api.dev.thepurplepiggybank.com/addUser` endpoint is used to add a new user. The request should include the following parameters in the raw request body:
- `username` (string): The username of the user.
- `email` (string): The email address of the user.
- `password` (string): The password for the user account.
- `mailOptIn` (boolean): Indicates whether the user has opted in for email communication.
- `phoneNumber` (string): The phone number of the user.
- `firstName` (string): The first name of the user.
- `lastName` (string): The last name of the user.
- `ipAddress` (string): The IP address of the user.
- `deviceDetails` (string): Details of the user's device.

The response to this request is in JSON format with the following schema:
```json
{
  "type": "object",
  "properties": {
    "message": {"type": "string"},
    "user": {
      "type": "object",
      "properties": {
        "uuid": {"type": "string"},
        "username": {"type": "string"},
        "firstName": {"type": "string"},
        "lastName": {"type": "string"},
        "email": {"type": "string"},
        "phoneNumber": {"type": "string"},
        "signupDate": {"type": "string"},
        "mailOptIn": {"type": "boolean"},
        "defaultHouseholdId": {"type": ["string", "null"]},
        "createdAt": {"type": "string"},
        "updatedAt": {"type": "string"},
        "confirmedEmail": {"type": "boolean"},
        "subscriptionEndDate": {"type": "string"},
        "subscriptionId": {"type": ["string", "null"]},
        "subscriptionStatus": {"type": "string"},
        "purchaseToken": {"type": ["string", "null"]},
        "receiptData": {"type": ["string", "null"]}
      }
    },
    "details": {
      "type": "object",
      "properties": {
        "$metadata": {
          "type": "object",
          "properties": {
            "httpStatusCode": {"type": "number"},
            "requestId": {"type": "string"},
            "attempts": {"type": "number"},
            "totalRetryDelay": {"type": "number"}
          }
        },
        "CodeDeliveryDetails": {
          "type": "object",
          "properties": {
            "AttributeName": {"type": "string"},
            "DeliveryMedium": {"type": "string"},
            "Destination": {"type": "string"}
          }
        },
        "UserConfirmed": {"type": "boolean"},
        "UserSub": {"type": "string"}
      }
    }
  }
}
```



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/addUser
```



***Body:***

```js
{
  "username": "test",
  "email": "drewkarriker+prod@gmail.com",
  "password": "SecurePassword123!",
  "mailOptIn": "true",
  "phoneNumber": "+1234567890",
  "firstName": "John",
  "lastName": "Doe",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

```



### 2. confirmPasswordResetCode


### Confirm Password Reset Code

This endpoint is used to confirm the password reset code.

#### Request Body

- `username` (string): The username for the account.
- `code` (string): The reset code received by the user.
- `newPassword` (string): The new password to be set.
- `ipAddress` (string): The IP address of the user's device.
- `deviceDetails` (string): Details of the user's device.


#### Response

The response of this request is a JSON schema. The structure of the response will be defined according to the JSON schema standards.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/confirmPasswordResetCode
```



***Body:***

```js
{
    "username": "test",
    "code": "518201",
    "newPassword": "NewSecurePassword123!",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

```



### 3. confirmSignup


### API Request Description

This endpoint is used to confirm the signup by sending a POST request to `api.dev.thepurplepiggybank.com/confirmSignup`. The request should include a JSON payload in the raw request body type with the following parameters:

- `username` (string): The username of the user.
- `confirmationCode` (string): The confirmation code for the signup.
- `ipAddress` (string): The IP address of the user.
- `deviceDetails` (string): Details of the user's device.


### API Response (JSON Schema)

``` json
{
    "type": "object",
    "properties": {
        "message": {"type": "string"},
        "details": {
            "type": "object",
            "properties": {
                "$metadata": {
                    "type": "object",
                    "properties": {
                        "httpStatusCode": {"type": "number"},
                        "requestId": {"type": "string"},
                        "attempts": {"type": "number"},
                        "totalRetryDelay": {"type": "number"}
                    }
                }
            }
        },
        "user": {
            "type": "object",
            "properties": {
                "uuid": {"type": "string"},
                "username": {"type": "string"},
                "firstName": {"type": "string"},
                "lastName": {"type": "string"},
                "email": {"type": "string"},
                "phoneNumber": {"type": "string"},
                "signupDate": {"type": "string"},
                "mailOptIn": {"type": "boolean"},
                "defaultHouseholdId": {"type": ["string", "null"]},
                "createdAt": {"type": "string"},
                "updatedAt": {"type": "string"},
                "confirmedEmail": {"type": "boolean"},
                "subscriptionEndDate": {"type": "string"},
                "subscriptionId": {"type": ["string", "null"]},
                "subscriptionStatus": {"type": "string"},
                "purchaseToken": {"type": ["string", "null"]},
                "receiptData": {"type": ["string", "null"]}
            }
        }
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/confirmSignup
```



***Body:***

```js
{
    "username": "test",
    "confirmationCode": "552651",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

```



### 4. deleteUser.js


The `POST` request to `/deleteUser` endpoint is used to delete a user from the system.

### Request Body

- `authorizationToken` (string): The token used for authorization.
- `ipAddress` (string): The IP address of the user.
- `deviceDetails` (string): Details of the user's device.


### Response

The response is in JSON format with the following schema:

``` json
{
    "message": "",
    "user": {
        "uuid": "",
        "username": "",
        "firstName": "",
        "lastName": "",
        "email": "",
        "phoneNumber": "",
        "signupDate": "",
        "mailOptIn": true,
        "defaultHouseholdId": null,
        "createdAt": "",
        "updatedAt": "",
        "confirmedEmail": true,
        "subscriptionEndDate": "",
        "subscriptionId": null,
        "subscriptionStatus": "",
        "purchaseToken": null,
        "receiptData": null
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/deleteUser
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJiNDM4ZjQwOC1lMDgxLTcwYzAtNDM4MS04ZmM4MzIwYzYwYTAiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjRlZTJjMmMyLWU4NDYtNGI4Ni1hMGNlLTAzMDU4MmIxZmMxOCIsImV2ZW50X2lkIjoiMTc2NTI0NDctNWE4ZS00OGRhLTkyZTktZmExMDQwZGE1ZWM2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjMxMjA3OSwiZXhwIjoxNzE2MzE1Njc5LCJpYXQiOjE3MTYzMTIwNzksImp0aSI6IjI5Njg4MzcxLWU4YTctNDAwYS1hNWFlLWY3Y2VmMzUzOTYyMiIsInVzZXJuYW1lIjoidGVzdCJ9.PQ87zVUTWsifen2v0c1PKQiWawYY5alcx9t1Hui-kRF7x6XcB4nPU64ocQ4EIaVpNMnU0dmXpCAn2r_K_knffNqZhlGazXeN-gO6803-BNr-Ka607YFRqeSIB3-5UcRgxDQ3zHMoSUfGd4qeDlA48g0slREz8Sz0WDgA5cY72xa5bHW9QtZtSxDuNOjedavQEL_adoSjJlqGkYO4WFwuZ8S_46rB9RUUQx6kVPLxeonl8_FRmoPyIRU12sjNNWT3f8luiEs3DV_TX7w4Gr9q9HWLiQmb5IPKOJ4lyClTv49H0R--mq03EsbrDiU-yGlzFsu8MdSKQW1gNkKAPZp0dA",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
}

```



### 5. editUser


### Edit User

This API endpoint is used to edit user details.

#### Request

- Method: POST
- URL: api.dev.thepurplepiggybank.com/editUser
- Headers:
    - Content-Type: application/json

##### Request Body Parameters

- `authorizationToken` (string, required): The authorization token for the user.
- `email` (string, required): The email address of the user.
- `phoneNumber` (string, required): The phone number of the user.
- `ipAddress` (string, required): The IP address of the user.
- `deviceDetails` (string, required): Details of the user's device.


#### Response

- Status: 200
- Content-Type: application/json


##### Response Body (JSON Schema)

``` json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        },
        "user": {
            "type": "object",
            "properties": {
                "uuid": {
                    "type": "string"
                },
                "username": {
                    "type": "string"
                },
                "firstName": {
                    "type": "string"
                },
                "lastName": {
                    "type": "string"
                },
                "email": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "signupDate": {
                    "type": "string"
                },
                "mailOptIn": {
                    "type": "boolean"
                },
                "defaultHouseholdId": {
                    "type": ["string", "null"]
                },
                "createdAt": {
                    "type": "string"
                },
                "updatedAt": {
                    "type": "string"
                },
                "confirmedEmail": {
                    "type": "boolean"
                },
                "subscriptionEndDate": {
                    "type": "string"
                },
                "subscriptionId": {
                    "type": ["string", "null"]
                },
                "subscriptionStatus": {
                    "type": "string"
                },
                "purchaseToken": {
                    "type": ["string", "null"]
                },
                "receiptData": {
                    "type": ["string", "null"]
                }
            },
            "required": ["uuid", "username", "firstName", "lastName", "email", "phoneNumber", "signupDate", "mailOptIn", "createdAt", "updatedAt", "confirmedEmail", "subscriptionStatus"]
        }
    },
    "required": ["message", "user"]
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/editUser
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJiNDM4ZjQwOC1lMDgxLTcwYzAtNDM4MS04ZmM4MzIwYzYwYTAiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjRlZTJjMmMyLWU4NDYtNGI4Ni1hMGNlLTAzMDU4MmIxZmMxOCIsImV2ZW50X2lkIjoiMTc2NTI0NDctNWE4ZS00OGRhLTkyZTktZmExMDQwZGE1ZWM2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjMxMjA3OSwiZXhwIjoxNzE2MzE1Njc5LCJpYXQiOjE3MTYzMTIwNzksImp0aSI6IjI5Njg4MzcxLWU4YTctNDAwYS1hNWFlLWY3Y2VmMzUzOTYyMiIsInVzZXJuYW1lIjoidGVzdCJ9.PQ87zVUTWsifen2v0c1PKQiWawYY5alcx9t1Hui-kRF7x6XcB4nPU64ocQ4EIaVpNMnU0dmXpCAn2r_K_knffNqZhlGazXeN-gO6803-BNr-Ka607YFRqeSIB3-5UcRgxDQ3zHMoSUfGd4qeDlA48g0slREz8Sz0WDgA5cY72xa5bHW9QtZtSxDuNOjedavQEL_adoSjJlqGkYO4WFwuZ8S_46rB9RUUQx6kVPLxeonl8_FRmoPyIRU12sjNNWT3f8luiEs3DV_TX7w4Gr9q9HWLiQmb5IPKOJ4lyClTv49H0R--mq03EsbrDiU-yGlzFsu8MdSKQW1gNkKAPZp0dA",
  "email": "newemail@example.com",
  "phoneNumber": "+1234567890",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
}

```



### 6. forgotPassword


### Forgot Password Request

This endpoint is used to initiate the process of resetting a user's password. The HTTP POST request should be sent to `api.dev.thepurplepiggybank.com/forgotPassword`.

#### Request Body

- `username` (string, required): The username of the user for whom the password reset is requested.
- `ipAddress` (string, required): The IP address of the user's device.
- `deviceDetails` (string, required): Details of the user's device.


#### Response

Upon successful execution, the API returns a status code of 200 with a JSON response in the following format:

``` json
{
    "message": "A message indicating the status of the password reset request"
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/forgotPassword
```



***Body:***

```js
{
    "username": "test",
    "ipAddress": "192.168.1.1",
    "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

```



### 7. getUser


The `POST` request to `/getUser` endpoint is used to retrieve user information.

### Request Body

- The request body should be in raw format with the following parameters:
    - `authorizationToken` (string): The authorization token for the request.
    - `ipAddress` (string): The IP address of the user.
    - `deviceDetails` (string): Details of the user's device.

### Response

The response to this request is a JSON object with the following properties:

- `uuid` (string): The unique identifier of the user.
- `username` (string): The username of the user.
- `firstName` (string): The first name of the user.
- `lastName` (string): The last name of the user.
- `email` (string): The email address of the user.
- `phoneNumber` (string): The phone number of the user.
- `signupDate` (string): The date of user signup.
- `mailOptIn` (boolean): Indicates if the user has opted in for mail notifications.
- `defaultHouseholdId` (null): The default household ID of the user.
- `createdAt` (string): The date and time of user creation.
- `updatedAt` (string): The date and time of user information update.
- `confirmedEmail` (boolean): Indicates if the user's email is confirmed.
- `subscriptionEndDate` (string): The end date of the user's subscription.
- `subscriptionId` (null): The ID of the user's subscription.
- `subscriptionStatus` (string): The status of the user's subscription.
- `purchaseToken` (null): The purchase token of the user.
- `receiptData` (null): The receipt data of the user.
- `households` (array): An array of user's households.
- `householdMembers` (array): An array of members in the user's households.
- `invited` (array): An array of invited users.
- `audits` (array): An array of audit logs with details of changes made.
    - `auditId` (string): The ID of the audit log.
    - `tableAffected` (string): The table affected by the change.
    - `actionType` (string): The type of action performed.
    - `oldValue` (string): The old value before the change.
    - `newValue` (string): The new value after the change.
    - `changedBy` (string): The user who made the change.
    - `changeDate` (string): The date of the change.
    - `timestamp` (string): The timestamp of the change.
    - `device` (string): The device used for the change.
    - `ipAddress` (string): The IP address of the user for the change.
    - `deviceType` (string): The type of device used for the change.
    - `ssoEnabled` (string): Indicates if single sign-on was enabled for the change.
- `securityLogs` (array): An array of security logs.
    - `logId` (string): The ID of the security log.
    - `userUuid` (string): The UUID of the user.
    - `loginTime` (string): The time of user login.
    - `ipAddress` (string): The IP address of the user during login.
    - `deviceDetails` (string): Details of the user's device during login.
    - `locationDetails` (string): Details of the user's location during login.
    - `actionType` (string): The type of action performed.
    - `createdAt` (string): The date and time of log creation.
- `notifications` (array): An array of user notifications.
- `tokens` (array): An array of user tokens.
    - `tokenId` (string): The ID of the token.
    - `userUuid` (string): The UUID of the user.
    - `accessToken` (string): The access token.
    - `refreshToken` (string): The refresh token.
    - `idToken` (string): The ID token.
    - `issuedAt` (string): The timestamp of token issuance.
    - `expiresIn` (number): The expiration time of the token.
    - `token` (string): The token value.
    - `type` (string): The type of the token.


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/getUser
```



***Body:***

```js
{
  "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJiNDM4ZjQwOC1lMDgxLTcwYzAtNDM4MS04ZmM4MzIwYzYwYTAiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjRlZTJjMmMyLWU4NDYtNGI4Ni1hMGNlLTAzMDU4MmIxZmMxOCIsImV2ZW50X2lkIjoiMTc2NTI0NDctNWE4ZS00OGRhLTkyZTktZmExMDQwZGE1ZWM2IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjMxMjA3OSwiZXhwIjoxNzE2MzE1Njc5LCJpYXQiOjE3MTYzMTIwNzksImp0aSI6IjI5Njg4MzcxLWU4YTctNDAwYS1hNWFlLWY3Y2VmMzUzOTYyMiIsInVzZXJuYW1lIjoidGVzdCJ9.PQ87zVUTWsifen2v0c1PKQiWawYY5alcx9t1Hui-kRF7x6XcB4nPU64ocQ4EIaVpNMnU0dmXpCAn2r_K_knffNqZhlGazXeN-gO6803-BNr-Ka607YFRqeSIB3-5UcRgxDQ3zHMoSUfGd4qeDlA48g0slREz8Sz0WDgA5cY72xa5bHW9QtZtSxDuNOjedavQEL_adoSjJlqGkYO4WFwuZ8S_46rB9RUUQx6kVPLxeonl8_FRmoPyIRU12sjNNWT3f8luiEs3DV_TX7w4Gr9q9HWLiQmb5IPKOJ4lyClTv49H0R--mq03EsbrDiU-yGlzFsu8MdSKQW1gNkKAPZp0dA",
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
}

```



### 8. login


### Login API

This API endpoint is used to authenticate the user.

#### Request Body

- `username` (string): The username of the user.
- `password` (string): The password of the user.
- `mfaCode` (string, optional): Only required if responding to a multi-factor authentication (MFA) challenge.
- `session` (string): Session token from the previous challenge response, if applicable.
- `ipAddress` (string): The IP address of the user.
- `deviceDetails` (string): Details of the user's device.
- `locationDetails` (string): Location details of the user.


#### Response

The response will be in JSON format with the following schema:

``` json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string"
    },
    "tokens": {
      "type": "object",
      "properties": {
        "AccessToken": {
          "type": "string"
        },
        "ExpiresIn": {
          "type": "integer"
        },
        "IdToken": {
          "type": "string"
        },
        "RefreshToken": {
          "type": "string"
        },
        "TokenType": {
          "type": "string"
        }
      }
    }
  }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/login
```



***Body:***

```js
{
  "username": "test",
  "password": "SecurePassword123!",
//   "mfaCode": "123456", // Only required if responding to an MFA challenge
  "session": "", // Session token from the previous challenge response, if applicable
  "ipAddress": "192.168.1.1",
  "deviceDetails": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "locationDetails": "San Francisco, CA, USA"
}

```



### 9. refreshToken



The `POST /refreshToken` endpoint is used to refresh the access token by providing the authorization token and refresh token in the request body.

### Request Body
- `authorizationToken` (text, required): The authorization token used for authentication.
- `refreshToken` (text, required): The refresh token used for token refreshment.

### Response
The response is in JSON format with the following schema:
```json
{
    "message": "",
    "tokens": {
        "AccessToken": "",
        "ExpiresIn": 0,
        "IdToken": "",
        "TokenType": ""
    }
}
```
- `message` (string): A message related to the token refresh process.
- `tokens` (object): An object containing the refreshed tokens.
  - `AccessToken` (string): The new access token.
  - `ExpiresIn` (number): The expiration time of the access token.
  - `IdToken` (string): The new ID token.
  - `TokenType` (string): The type of token.



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/refreshToken
```



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJjNGU4ZTRmOC1kMGQxLTcwYjMtOWI2NC1iM2M0YmJjOWNmYzIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjFkMGZlMWNiLTk2YmYtNGNhYS04NTA3LTdjMDI4N2RiZWE2YSIsImV2ZW50X2lkIjoiMDRhYzZiOGItZGM0Zi00ODc5LTk1NjgtZTlkZGMxYTEzNzA3IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjMxNTUxMCwiZXhwIjoxNzE2MzE5NTQ2LCJpYXQiOjE3MTYzMTU5NDYsImp0aSI6ImMzMzU0YzhjLTU3YzMtNDk0Ni1iYTYzLTY3NTkxYWEwYWU3MCIsInVzZXJuYW1lIjoidGVzdDIifQ.pScMzuuDw2QbYseLDl6-8LvOMF-LZgQp-BVjcm28tbleg72zoz_i3xdPYBU-0l3Q1dxpC7dljLWKlarVPFji_YXy53_KzbQsm8k2DwYx6cZ6pIq9naOFzWZ_c1VWdD39oGIVeFIyI3FBfbuhrckEB5Lw73NN7U2m2cUZFNJZGg-x_It_L3fu5r4aBjI3l6TmZ-9_a9JK_Ci4aSSjb8sb3bOxeEHQ-eg259cy-hesODM2zD6TGlvgGmSe5mLBrDXK-Byo0xFTvgOab__7L8O3F0kWS8bzs3tlUc-ez02BAClOirE7WBnelEXIZoiyJffKHyEu45Tb9PQy-oCUYrMgew",
    "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.AI6X-Bn0fJS-xzBpSrZ-Z9lYoWPl3bVAHAitZSTreXUHu-D4G6sozW8mE19TxVIR1Bc_Z_Q2gB9nVI5YoIEl3JMCjxQF2_peV0MJ1JQGcXLUHBjR7Ubp7m6bHM_OhWipfekGEWJGFOwizHFRGYaZF0aTNSYrscsOugRSTTWDjYMqTff553jSdw3dT9YKzLdN6RRX5zn2tCpAhSGxOzEWvJvgypgXpKAEZrWReXy6fDl0-f33VAKdGp4hd91xPAbfxRwMtbcUbj0Y--ZsVJois0tNVc7HVtzzAm5TiM9mZTIMUm6Z8NVekAAg5zOjkvN3YhOriFCvD520-NP9-B0ViQ.m7V-ZGQAO8flcDaD.VXVNkENN5px2kk213NdmyG9vhhtPl3TWxAKCZQLKNhWzYC4do1a1gdngNsUlhZ3TS5Ojn9cx3xrNXmOG1ZBpI8XcpANTT5hGpbLUblpzXI1_vx7qR0khqw-BmuexgpDK2libbhO9hUAaLA5H3CYqXvpQrhJwvGOLN1pTdXdQ0cO9ikwsmZ74xVOYB1h1hUZphppAR9sjBi7UCorD_beu1_Bm3sQcbUDOL6ERwlq3euu0auAzXQD11jC5Aw_AAAip8or1dfgA1D1t6HNvBy8QBRBgrEcWsod2xC-bVI4gDYZyBaMIARF0504j_otipwLmJ5sghTV0vL-sSfDDlpn-W8eSlPDLsYBuZc9S0-mUE5Z4h6tGtnr-VOE53InrLoDg6tvrp7kTHZrO1kaN--Tk2EBqa4kO8wPfnBlJ31UmUxamrxkmNsNCUtUSObI9bk14CGDdwZTyIc45btfDMvn4P-QZp4cdwt3a42QbRPbAyNkzmNbSe3A9AlnP1t8aubpn_QfCTTAipPVvc7IpLc8u-jxkjZ6sEPYTTv76gwR7Ah_fY3n0BXIV9F6dsIab12MWJfPQZPdof5ZdAl-QZv4O0FFgRbzVYVl09tm2iA3nXnDX79v9Re_xob44UtSlR7s95JashTJnd2tOJKQBkydFLpLTjvShwRyFY57xhA9gG83RUb-v0FSz8Fv8rUqVTHEq98meLN-rbi5eavyP3TYmkvCz2tir565a3XvCVG-lUoiCnaS3-0fvdbn3K3oSwnlzdERL80TqzEIbLf533jTu7Qyr3AoP3XHHYp9iLU7zESF3XanhtuKMqr8b3sqK5u96szucra5gKJy6WOCFpYC6S_YQkX2rfZTwbUGaHfTh1TgxZWTk01LgMLmpaeZYvAP8JJVrRmi4rQ8VirytZuToiws_-CSg9wdGHnoLzMQ1NvNOt5zoB3YJKiFCVYfw2-47VPNrwpsqVthDbd3NNVI_SYoJFw5Uw59PRuvnPrwhqVBDxzgogTT2fI-PF-A0pSbTPUWtzIxgm7AisKKzjWWN-9taTWMu27z02zWjOZOVJAUsnNwcObfTxCovl6A59-6nWvNRGHMEBbH8g3vFpv4PKMeC-se5vTrZn0HR0tieKUGynbF7C8tfTTtBprXTZsYa7OcKjyKKH7oCgwQdvlP82x9wl_VdZ829GZlVfcc3JXf-mSkA9ewKEWNSMVe6TFHHhpJrqmcUY9iarU6MqXdAo86-FaYN4edtovxfyq8oXQJD2IhsPC5g4MZ3TcFfcPikaQ.JuE54rX72e-Th7PAKVkdag"
}
```



### 10. revokeToken


This endpoint is used to revoke a token by making an HTTP POST request to api.dev.thepurplepiggybank.com/revokeToken. The request should include a raw body with the "authorizationToken" and "refreshToken" parameters.

### Request Body

- authorizationToken (string)
- refreshToken (string)


### Response

The response will have a status code of 200 and a content type of application/json. The response body will be a JSON object with a "message" key.

``` json
{
    "type": "object",
    "properties": {
        "message": {
            "type": "string"
        }
    }
}

 ```


***Endpoint:***

```bash
Method: POST
Type: RAW
URL: api.dev.thepurplepiggybank.com/revokeToken
```



***Body:***

```js
{
    "authorizationToken": "eyJraWQiOiJrZ1FJcEZkYUlVRUhETGQ4NmIyYkh0a1lvbitKOVRsbkdzSUZoaElld0VzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJjNGU4ZTRmOC1kMGQxLTcwYjMtOWI2NC1iM2M0YmJjOWNmYzIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV84UVA2MkdoQ0EiLCJjbGllbnRfaWQiOiJoNm81ZmhqNDAycXZnbG50MDE1MTdzaHAxIiwib3JpZ2luX2p0aSI6IjFkMGZlMWNiLTk2YmYtNGNhYS04NTA3LTdjMDI4N2RiZWE2YSIsImV2ZW50X2lkIjoiMDRhYzZiOGItZGM0Zi00ODc5LTk1NjgtZTlkZGMxYTEzNzA3IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTcxNjMxNTUxMCwiZXhwIjoxNzE2MzE5OTIyLCJpYXQiOjE3MTYzMTYzMjIsImp0aSI6Ijk2ZTBmZTAyLTM4ZGUtNDc1NC1iMjhkLTdkYjhmMjQ5MDI0MCIsInVzZXJuYW1lIjoidGVzdDIifQ.gLrKgDDn4Ptn6cuxp57aZrUQqmerNObN9CryiOidapKo5ibcYcT77VGWewBjDR4EyE972eAsDdjnncuRWk41oMp998rqB0Dzh46R5JwyUtmdTTehaNmBFv6cktpjD7C5Pf486m9aHC6G67hW8bgJy9S23n7jJ-hXUMdCnKFrqeNSh5AZZgbuxW2dBcNva2RIdeJdu0D2hIs6DwIsUF390_LmNDxCcxububLHJBHKx4-4s0jsMW1JvUvVvCdM9VLwmgr-QOenHDxus3CbGuJsGelJn31VAkxZDf7Yt9qtD_3oGENSUBSZimjBaUcuZ0N3fTNXTzC7LUolaxjS5scmiw",
    "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.AI6X-Bn0fJS-xzBpSrZ-Z9lYoWPl3bVAHAitZSTreXUHu-D4G6sozW8mE19TxVIR1Bc_Z_Q2gB9nVI5YoIEl3JMCjxQF2_peV0MJ1JQGcXLUHBjR7Ubp7m6bHM_OhWipfekGEWJGFOwizHFRGYaZF0aTNSYrscsOugRSTTWDjYMqTff553jSdw3dT9YKzLdN6RRX5zn2tCpAhSGxOzEWvJvgypgXpKAEZrWReXy6fDl0-f33VAKdGp4hd91xPAbfxRwMtbcUbj0Y--ZsVJois0tNVc7HVtzzAm5TiM9mZTIMUm6Z8NVekAAg5zOjkvN3YhOriFCvD520-NP9-B0ViQ.m7V-ZGQAO8flcDaD.VXVNkENN5px2kk213NdmyG9vhhtPl3TWxAKCZQLKNhWzYC4do1a1gdngNsUlhZ3TS5Ojn9cx3xrNXmOG1ZBpI8XcpANTT5hGpbLUblpzXI1_vx7qR0khqw-BmuexgpDK2libbhO9hUAaLA5H3CYqXvpQrhJwvGOLN1pTdXdQ0cO9ikwsmZ74xVOYB1h1hUZphppAR9sjBi7UCorD_beu1_Bm3sQcbUDOL6ERwlq3euu0auAzXQD11jC5Aw_AAAip8or1dfgA1D1t6HNvBy8QBRBgrEcWsod2xC-bVI4gDYZyBaMIARF0504j_otipwLmJ5sghTV0vL-sSfDDlpn-W8eSlPDLsYBuZc9S0-mUE5Z4h6tGtnr-VOE53InrLoDg6tvrp7kTHZrO1kaN--Tk2EBqa4kO8wPfnBlJ31UmUxamrxkmNsNCUtUSObI9bk14CGDdwZTyIc45btfDMvn4P-QZp4cdwt3a42QbRPbAyNkzmNbSe3A9AlnP1t8aubpn_QfCTTAipPVvc7IpLc8u-jxkjZ6sEPYTTv76gwR7Ah_fY3n0BXIV9F6dsIab12MWJfPQZPdof5ZdAl-QZv4O0FFgRbzVYVl09tm2iA3nXnDX79v9Re_xob44UtSlR7s95JashTJnd2tOJKQBkydFLpLTjvShwRyFY57xhA9gG83RUb-v0FSz8Fv8rUqVTHEq98meLN-rbi5eavyP3TYmkvCz2tir565a3XvCVG-lUoiCnaS3-0fvdbn3K3oSwnlzdERL80TqzEIbLf533jTu7Qyr3AoP3XHHYp9iLU7zESF3XanhtuKMqr8b3sqK5u96szucra5gKJy6WOCFpYC6S_YQkX2rfZTwbUGaHfTh1TgxZWTk01LgMLmpaeZYvAP8JJVrRmi4rQ8VirytZuToiws_-CSg9wdGHnoLzMQ1NvNOt5zoB3YJKiFCVYfw2-47VPNrwpsqVthDbd3NNVI_SYoJFw5Uw59PRuvnPrwhqVBDxzgogTT2fI-PF-A0pSbTPUWtzIxgm7AisKKzjWWN-9taTWMu27z02zWjOZOVJAUsnNwcObfTxCovl6A59-6nWvNRGHMEBbH8g3vFpv4PKMeC-se5vTrZn0HR0tieKUGynbF7C8tfTTtBprXTZsYa7OcKjyKKH7oCgwQdvlP82x9wl_VdZ829GZlVfcc3JXf-mSkA9ewKEWNSMVe6TFHHhpJrqmcUY9iarU6MqXdAo86-FaYN4edtovxfyq8oXQJD2IhsPC5g4MZ3TcFfcPikaQ.JuE54rX72e-Th7PAKVkdag"
}
```



---
[Back to top](#tppb)

>Generated at 2024-05-23 21:31:23 by [docgen](https://github.com/thedevsaddam/docgen)
