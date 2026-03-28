import pymysql

try:
    # Connect to MySQL Server without specifying DB
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password=''
    )
    with connection.cursor() as cursor:
        cursor.execute("CREATE DATABASE IF NOT EXISTS aimoneymentor;")
    connection.commit()
    print("Database created successfully!")
except Exception as e:
    print(f"Failed to create database: {e}")
