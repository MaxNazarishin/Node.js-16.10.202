let express = require('express');
let bodyParser = require('body-parser');
let mssql = require('mssql');
let fs = require('fs');

let app = express();
let port = 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/html', express.static(__dirname + '/html'));

let config = {
   server: 'MAKS\\SQLEXPRESS',
   database: 'ATB',
   user: '222',
   password: '222',
   options: {
      encrypt: true,
      trustServerCertificate: true
   }
};

app.get('/', (req, res) => {
   res.redirect('/html/main.html');
});

app.post('/login', async (req, res) => {
   let { login, password } = req.body;

   try {
      await mssql.connect(config);

      let queryAdmin = `SELECT * FROM ATB_Admin WHERE Login = @login AND Password = @password`;
      let requestAdmin = new mssql.Request();
      requestAdmin.input('login', mssql.NVarChar(50), login);
      requestAdmin.input('password', mssql.NVarChar(50), password);

      let resultAdmin = await requestAdmin.query(queryAdmin);

      if (resultAdmin.recordset.length > 0) {
         return res.redirect('/admin');
      }

      let queryUser = `SELECT * FROM ATB_User WHERE Login = @login AND Password = @password`;
      let requestUser = new mssql.Request();
      requestUser.input('login', mssql.NVarChar(50), login);
      requestUser.input('password', mssql.NVarChar(50), password);

      let resultUser = await requestUser.query(queryUser);

      if (resultUser.recordset.length > 0) {
         return res.redirect('/html/user.html');
      } else {
         return res.status(401).send('Невірний логін або пароль');
      }
   } catch (err) {
      console.log(err);
      return res.status(500).send('Помилка з\'єднання з базою даних');
   }
});

app.post('/register', async (req, res) => {
   let { name, login, password } = req.body;

   try {
      await mssql.connect(config);

      let queryCheckUser = `SELECT * FROM ATB_User WHERE Login = @login`;
      let requestCheckUser = new mssql.Request();
      requestCheckUser.input('login', mssql.NVarChar(50), login);

      let resultCheck = await requestCheckUser.query(queryCheckUser);

      if (resultCheck.recordset.length > 0) {
         return res.status(409).send('Ім\'я користувача зайняте');
      }

      let queryInsertUser = `INSERT INTO ATB_User (Name, Login, Password) VALUES (@name, @login, @password)`;
      let requestInsertUser = new mssql.Request();
      requestInsertUser.input('name', mssql.NVarChar(100), name);
      requestInsertUser.input('login', mssql.NVarChar(50), login);
      requestInsertUser.input('password', mssql.NVarChar(50), password);

      await requestInsertUser.query(queryInsertUser);
      res.send('Реєстрація успішна');
   } catch (err) {
      console.log(err);
      return res.status(500).send('Помилка з\'єднання з базою даних');
   }
});

app.get('/admin', async (req, res) => {
   try {
      await mssql.connect(config);

      let queryUsers = `SELECT ID, Name, Login, Password FROM ATB_User`;
      let requestUsers = new mssql.Request();
      let resultUsers = await requestUsers.query(queryUsers);

      let userRows = resultUsers.recordset.map(user => {
         return `<tr>
                     <td>${user.ID}</td>
                     <td>${user.Name}</td>
                     <td>${user.Login}</td>
                     <td>${user.Password}</td>
                     <td>
                        <button onclick="editUser(${user.ID}, '${user.Name}', '${user.Login}', '${user.Password}')">Редагувати</button>
                        <button onclick="deleteUser(${user.ID})">Видалити</button>
                     </td>
                 </tr>`;
      }).join('');

      fs.readFile(__dirname + '/html/admin.html', 'utf8', (err, data) => {
         if (err) {
            console.log(err);
            return res.status(500).send('Помилка при читанні HTML-файлу');
         }

         const result = data.replace('{{userRows}}', userRows);
         res.send(result);
      });
   } catch (err) {
      console.log(err);
      return res.status(500).send('Помилка з\'єднання з базою даних');
   }
});

app.put('/edit/:id', async (req, res) => {
   const userId = req.params.id;
   const { name, login, password } = req.body;

   try {
      await mssql.connect(config);

      let queryUpdateUser = `UPDATE ATB_User SET Name = @name, Login = @login, Password = @password WHERE ID = @id`; // Додаємо логін в запит
      let requestUpdateUser = new mssql.Request();
      requestUpdateUser.input('id', mssql.Int, userId);
      requestUpdateUser.input('name', mssql.NVarChar(100), name);
      requestUpdateUser.input('login', mssql.NVarChar(50), login);
      requestUpdateUser.input('password', mssql.NVarChar(50), password);

      await requestUpdateUser.query(queryUpdateUser);
      res.sendStatus(200);
   } catch (err) {
      console.log(err);
      res.status(500).send('Помилка при редагуванні користувача');
   }
});


app.delete('/delete/:id', async (req, res) => {
   const userId = req.params.id;

   try {
      await mssql.connect(config);

      let queryDeleteUser = `DELETE FROM ATB_User WHERE ID = @id`;
      let requestDeleteUser = new mssql.Request();
      requestDeleteUser.input('id', mssql.Int, userId);

      await requestDeleteUser.query(queryDeleteUser);
      res.sendStatus(200);
   } catch (err) {
      console.log(err);
      res.status(500).send('Помилка при видаленні користувача');
   }
});

app.listen(port, () => {
   console.log('app listening on port ' + port);
});