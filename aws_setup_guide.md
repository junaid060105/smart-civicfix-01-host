# AWS Setup Guide — Smart CivicFix (Step-by-Step)

> [!IMPORTANT]
> Follow these steps **in order**. Each step produces values you'll need later. Keep a notepad open to save them.

---

## Step 0: Create an AWS Account (if you don't have one)

1. Go to [https://aws.amazon.com](https://aws.amazon.com) → Click **Create an AWS Account**
2. Enter email, password, account name
3. Add a payment method (you won't be charged — everything here is free tier)
4. Verify your phone number
5. Select **Basic Support (Free)**

---

## Step 1: Amazon Cognito (Authentication)

This handles user sign-up & sign-in.

### 1.1 Create a User Pool

1. Go to **AWS Console** → Search for **Cognito** → Click it
2. Click **Create user pool**
3. Configure sign-in experience:
   - **Cognito user pool sign-in options**: Check ✅ **Email**
   - Click **Next**

4. Configure security requirements:
   - **Password policy**: Choose **Cognito defaults** (or customize min 8 chars)
   - **Multi-factor authentication**: Select **No MFA** (simpler for your project)
   - **User account recovery**: Check ✅ **Email only**
   - Click **Next**

5. Configure sign-up experience:
   - **Self-registration**: ✅ **Enable** (so citizens can sign up)
   - **Cognito-assisted verification**: ✅ **Send email message, verify email address**
   - **Required attributes**: Check ✅ **name** and ✅ **email**
   - Click **Next**

6. Configure message delivery:
   - Select **Send email with Cognito** (free, no SES setup needed)
   - Click **Next**

7. Integrate your app:
   - **User pool name**: `civicfix-users`
   - **Hosted authentication pages**: Uncheck (we're using our own login page)
   - **App type**: Select **Public client**
   - **App client name**: `civicfix-web`
   - **Client secret**: Select **Don't generate a client secret**
   - **Authentication flows**: Make sure ✅ **ALLOW_USER_PASSWORD_AUTH** is checked
   - Click **Next**

8. Review and click **Create user pool**

### 1.2 Save Your Values

After creation, click on your new user pool. You'll see:

| What to copy | Where to find it |
|---|---|
| **User Pool ID** | Top of the page, looks like `ap-south-1_AbCdEfGhI` |
| **Region** | First part of the Pool ID, e.g. `ap-south-1` |
| **App Client ID** | Go to **App integration** tab → scroll to **App clients** → copy the **Client ID** (long string) |

> [!TIP]
> 📝 Write these down! You'll paste them into `aws-config.js` at the end.

### 1.3 Create Admin Group

1. In your User Pool → Click **Groups** tab
2. Click **Create group**
3. **Group name**: `admin`
4. Leave precedence as `0`
5. Click **Create group**

### 1.4 Create Your Admin User

1. In your User Pool → Click **Users** tab
2. Click **Create user**
3. Fill in:
   - **Email address**: your admin email
   - **Temporary password**: set a password
   - Check ✅ **Mark email address as verified**
4. Click **Create user**
5. Go back to **Groups** → Click on `admin` → Click **Add user to group** → Select your admin user

---

## Step 2: DynamoDB (Database)

### 2.1 Create Table: `civicfix-users`

1. AWS Console → Search **DynamoDB** → Click it
2. Click **Create table**
3. Settings:
   - **Table name**: `civicfix-users`
   - **Partition key**: `userId` (Type: **String**)
   - Leave sort key empty
   - **Table settings**: Select **Default settings**
4. Click **Create table**

### 2.2 Create Table: `civicfix-issues`

1. Click **Create table**
2. Settings:
   - **Table name**: `civicfix-issues`
   - **Partition key**: `issueId` (Type: **String**)
   - Leave sort key empty
   - **Table settings**: Default
3. Click **Create table**

**Now add 2 Global Secondary Indexes (GSIs):**

4. Click on the `civicfix-issues` table → Go to **Indexes** tab
5. Click **Create index**:
   - **Partition key**: `userId` (String)
   - **Sort key**: `createdAt` (String)
   - **Index name**: `userId-index`
   - Leave other settings as default
   - Click **Create index**
6. Click **Create index** again:
   - **Partition key**: `refId` (String)
   - **Sort key**: leave empty
   - **Index name**: `refId-index`
   - Click **Create index**

> [!NOTE]
> Wait for each index to become **Active** before creating the next one (takes 1-2 minutes).

### 2.3 Create Table: `civicfix-stats`

1. Click **Create table**
2. Settings:
   - **Table name**: `civicfix-stats`
   - **Partition key**: `statId` (Type: **String**)
3. Click **Create table**

**Seed with initial data:**

4. Click on `civicfix-stats` → Click **Explore table items**
5. Click **Create item**
6. Switch to **JSON view** (toggle at top)
7. Paste this:
```json
{
  "statId": {"S": "global"},
  "totalReported": {"N": "0"},
  "totalResolved": {"N": "0"}
}
```
8. Click **Create item**

### 2.4 Create Table: `civicfix-redemptions`

1. Click **Create table**
2. Settings:
   - **Table name**: `civicfix-redemptions`
   - **Partition key**: `redemptionId` (Type: **String**)
3. Click **Create table**

---

## Step 3: IAM Role (Permissions for Lambda)

Before creating Lambda functions, you need a role that gives them DynamoDB access.

1. AWS Console → Search **IAM** → Click it
2. Click **Roles** → **Create role**
3. **Trusted entity type**: AWS Service
4. **Use case**: Lambda → Click **Next**
5. Search and check these policies:
   - ✅ `AmazonDynamoDBFullAccess`
   - ✅ `AWSLambdaBasicExecutionRole`
6. Click **Next**
7. **Role name**: `civicfix-lambda-role`
8. Click **Create role**

---

## Step 4: Lambda Functions (Backend Logic)

You'll create 13 Lambda functions. Here's the process (repeat for each):

### How to create each Lambda function:

1. AWS Console → Search **Lambda** → Click it
2. Click **Create function**
3. Settings:
   - **Function name**: (see table below)
   - **Runtime**: **Python 3.12**
   - **Architecture**: x86_64
   - **Execution role**: Choose **Use an existing role** → Select `civicfix-lambda-role`
4. Click **Create function**
5. In the code editor, **delete** the default code
6. **Paste** the code from the corresponding `.py` file in your `website-live/lambda/` folder
7. Click **Deploy**

### Lambda Functions to Create:

| # | Function Name | Code File | Trigger Route |
|---|---|---|---|
| 1 | `civicfix-createUser` | `createUser.py` | `POST /api/users` |
| 2 | `civicfix-getUser` | `getUser.py` | `GET /api/users/{userId}` |
| 3 | `civicfix-submitIssue` | `submitIssue.py` | `POST /api/issues` |
| 4 | `civicfix-getUserIssues` | `getUserIssues.py` | `GET /api/issues` |
| 5 | `civicfix-getAllIssues` | `getAllIssues.py` | `GET /api/issues/all` |
| 6 | `civicfix-trackIssue` | `trackIssue.py` | `GET /api/issues/track/{refId}` |
| 7 | `civicfix-getStats` | `getStats.py` | `GET /api/stats` |
| 8 | `civicfix-updateIssueStatus` | `updateIssueStatus.py` | `PATCH /api/admin/issues/{issueId}` |
| 9 | `civicfix-redeemReward` | `redeemReward.py` | `POST /api/rewards/redeem` |
| 10 | `civicfix-adminGetAllIssues` | `adminGetAllIssues.py` | `GET /api/admin/issues` |
| 11 | `civicfix-adminGetAllUsers` | `adminGetAllUsers.py` | `GET /api/admin/users` |
| 12 | `civicfix-adminGetDashboardStats` | `adminGetDashboardStats.py` | `GET /api/admin/stats` |
| 13 | `civicfix-adminDeleteIssue` | `adminDeleteIssue.py` | `DELETE /api/admin/issues/{issueId}` |

> [!TIP]
> You can open each `.py` file from `website-live/lambda/`, copy the entire contents, and paste into the Lambda code editor.

---

## Step 5: API Gateway (REST API)

This creates the URL endpoints that your frontend calls.

### 5.1 Create the API

1. AWS Console → Search **API Gateway** → Click it
2. Click **Create API**
3. Choose **REST API** (not HTTP API) → Click **Build**
4. Settings:
   - **API name**: `civicfix-api`
   - **Description**: Smart CivicFix Backend API
   - **Endpoint type**: Regional
5. Click **Create API**

### 5.2 Create Resources & Methods

You need to create this resource tree:

```
/api
├── /users                    POST → civicfix-createUser
│   └── /{userId}             GET  → civicfix-getUser
├── /issues                   POST → civicfix-submitIssue
│   │                         GET  → civicfix-getUserIssues
│   ├── /all                  GET  → civicfix-getAllIssues
│   └── /track
│       └── /{refId}          GET  → civicfix-trackIssue
├── /stats                    GET  → civicfix-getStats
├── /rewards
│   └── /redeem               POST → civicfix-redeemReward
└── /admin
    ├── /issues               GET  → civicfix-adminGetAllIssues
    │   └── /{issueId}        PATCH → civicfix-updateIssueStatus
    │                         DELETE → civicfix-adminDeleteIssue
    ├── /users                GET  → civicfix-adminGetAllUsers
    └── /stats                GET  → civicfix-adminGetDashboardStats
```

**How to create each resource & method:**

1. Select the parent resource (e.g., `/`)
2. Click **Create Resource**
3. **Resource Name**: `api` → Click **Create Resource**
4. Select `/api` → **Create Resource** → Name: `users`
5. Select `/api/users` → **Create Method** → Choose **POST**
   - **Integration type**: Lambda Function
   - **Lambda Function**: `civicfix-createUser`
   - **Lambda Proxy integration**: ✅ Check this
   - Click **Create Method**
6. Select `/api/users` → **Create Resource** → Name: `{userId}` (with the curly braces!)
7. Select `/api/users/{userId}` → **Create Method** → **GET** → `civicfix-getUser` (Lambda proxy ✅)

**Repeat this pattern** for every route in the tree above.

> [!IMPORTANT]
> Always check ✅ **Lambda Proxy integration** when creating methods. This passes the full request to Lambda.

### 5.3 Enable CORS on Every Resource

For each resource:
1. Select the resource (e.g., `/api/users`)
2. Click **Enable CORS**
3. Check all methods: GET, POST, PATCH, DELETE, OPTIONS
4. **Access-Control-Allow-Origin**: `*`
5. **Access-Control-Allow-Headers**: `Content-Type,Authorization`
6. Click **Enable CORS and replace existing CORS headers**

> [!WARNING]
> Do this for EVERY resource that has methods. If you skip this, the browser will block requests.

### 5.4 Add Cognito Authorizer (for protected routes)

1. In your API → Click **Authorizers** in the left menu
2. Click **Create New Authorizer**
3. Settings:
   - **Name**: `civicfix-cognito-auth`
   - **Type**: Cognito
   - **Cognito User Pool**: Select `civicfix-users`
   - **Token Source**: `Authorization`
4. Click **Create**

Now go back and **add the authorizer** to protected methods:
- All methods **except** `GET /api/stats`, `GET /api/issues/all`, and `OPTIONS` methods
- Click on the method → Click **Method Request** → **Authorization**: Select `civicfix-cognito-auth`

### 5.5 Deploy the API

1. Click **Deploy API**
2. **Stage name**: `prod`
3. Click **Deploy**
4. You'll see the **Invoke URL** at the top, e.g.:
   ```
   https://abc123def.execute-api.ap-south-1.amazonaws.com/prod
   ```

> [!TIP]
> 📝 Copy this URL! This is your API base URL.

---

## Step 6: Update `aws-config.js`

Open [aws-config.js](file:///c:/Users/jysha/OneDrive/Desktop/junaid/FINAL%20YEAR%20PRJ/website-live/aws-config.js) and replace the placeholder values:

```javascript
const AWS_CONFIG = {
  region: "ap-south-1",                                    // ← your region
  cognito: {
    userPoolId: "ap-south-1_XXXXXXXXX",                    // ← from Step 1.2
    clientId: "xxxxxxxxxxxxxxxxxxxxxxxxxx",                // ← from Step 1.2
  },
  apiBaseUrl: "https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod"  // ← from Step 5.5
};
```

Replace:
- `ap-south-1_XXXXXXXXX` → Your **User Pool ID** from Step 1.2
- `xxxxxxxxxxxxxxxxxxxxxxxxxx` → Your **App Client ID** from Step 1.2
- The API URL → Your **Invoke URL** from Step 5.5

---

## Step 7: Test Locally

1. Open `website-live/index.html` in your browser
2. The counters should show `0` (or fallback values if API isn't reachable yet)
3. Click **Create Account** → sign up with a real email
4. Check your email for the verification code
5. After verification → log in
6. Submit a complaint → check DynamoDB `civicfix-issues` table for the new item
7. Go to admin-login.html → sign in with the admin user you created in Step 1.4

---

## Step 8: Deploy to S3 + CloudFront (Optional — for public access)

### 8.1 Create S3 Bucket

1. AWS Console → S3 → **Create bucket**
2. **Bucket name**: `civicfix-website` (must be globally unique, try `civicfix-website-<yourname>`)
3. **Region**: Same as your other services
4. Uncheck **Block all public access** → Acknowledge the warning
5. Click **Create bucket**

### 8.2 Enable Static Website Hosting

1. Click on your bucket → **Properties** tab
2. Scroll to **Static website hosting** → Click **Edit**
3. **Enable** static hosting
4. **Index document**: `index.html`
5. Click **Save**

### 8.3 Add Bucket Policy

1. Go to **Permissions** tab → **Bucket Policy** → Click **Edit**
2. Paste:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```
3. Replace `YOUR-BUCKET-NAME` with your actual bucket name
4. Click **Save**

### 8.4 Upload Files

1. Click **Objects** tab → **Upload**
2. Upload ALL files from `website-live/` **except** the `lambda/` folder
3. Click **Upload**

### 8.5 Access Your Website

Your site is now live at:
```
http://YOUR-BUCKET-NAME.s3-website.ap-south-1.amazonaws.com
```

---

## Quick Reference Card

| Value | Where It Goes |
|---|---|
| User Pool ID | `aws-config.js` → `cognito.userPoolId` |
| App Client ID | `aws-config.js` → `cognito.clientId` |
| Region | `aws-config.js` → `region` |
| API Gateway URL | `aws-config.js` → `apiBaseUrl` |
