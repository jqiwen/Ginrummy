################################################
# Define authentication standard, reference to future authentication module
# Contact: Qixuan Zhong (zhongq7@mcmaster.ca)
# 
#   May need to be translated to other languages
#   But we should have similar logic so translation should be easy
#
#   Pre-condition: Should have api call to database. I need to use the user name as a key and retrieve a key hash
#   Post-condition: Return access approval/denine as a method
#                   Should have a account creation method
#
################################################

from hashlib import sha256

class Authentication():
    fake_database = {}
    def translated_password(self, password:str):
        return sha256(password.encode('utf-8')).hexdigest()
    
    def create_account(self, user_name: str, password: str):
        # When user create an account. 
        # This method is expected to store the user credential(in encrypted version, in the worst case of a leakage of our database)
        # This should be called after user enter all necessary information (intended user name and password)
        if self.fake_database.get(user_name) != None:
            print("User already exists")
            return False
        
        encrypted_password = self.translated_password(password)

        # Replace with API call to store username/password
        self.fake_database[user_name] = encrypted_password
        print("Created account for " + user_name)
        return True
    
    def verify_account(self, user_name: str, password: str):
        # Return false if access denied

        # User not found: 
        if self.fake_database.get(user_name) == None:
            print("User not found")
            return 1, "User not found"
        
        if self.fake_database.get(user_name) != self.translated_password(password):
            return 2, "Wrong password"
        
        print(user_name + " Access Granted")
        return 0, "OK"
    
    def remove_account(self, user_name: str, password: str):
        if self.verify_account(user_name, password):
            self.fake_database.pop(user_name)
            print("Removed account for " + user_name)
            return True

        return False
    
    def change_password(self, user_name: str, old_password: str, new_password: str):
        if self.verify_account(user_name, old_password):
            self.fake_database[user_name] = self.translated_password(new_password)
            print("Changed password for " + user_name)
            return True

        return False

def unit_test():
    test = Authentication()
    test.create_account("Alice", "Alice_password")
    test.create_account("Bob", "Bob_password")
    test.create_account("Charlie", "Charlie_password")
    test.create_account("David", "David_password")
    print("-------------------------------")
    test.verify_account("Alice", "Alice_password")
    test.verify_account("Bob", "Boo_password")
    test.verify_account("Trudy", "Bob_password")
    print("-------------------------------")
    test.verify_account("Charlie", "Charlie_password")
    test.change_password("Charlie", "Charlie_password", "Charlie_new_password")
    test.verify_account("Charlie", "Charlie_password")
    test.verify_account("Charlie", "Charlie_new_password")
    print("-------------------------------")
    test.verify_account("David", "David_password")
    test.remove_account("David", "David_password")
    test.verify_account("Alice", "Alice_password")
    test.verify_account("David", "David_password")



