$(function(){
    let $registerForm =$("#registration")
    if($registerForm.length){
        $registerForm.validate({
            rules:{
                name:{
                    required:true
                },
                username:{
                    required:true
                },
                password:{
                    required:true,
                    minlength:8,
                },
                conformPassword:{
                    required:true,
                    equalTo:"#password"
                },
                email:{
                    required:true,
                    email:true
                },
                mobile:{
                    required:true,
                    digits:true
                }
            },
            messages:{
                name:{
                    required:'User name is mandatory'
                },
                username:{
                    required:'Username is mandatory'
                },
                password:{
                    required:'Password is mandatory',
                    minlength:'password must be atleast 8 characters long'
                },
                conformPassword:{
                    required:'ConformPassword is mandatory',
                    equalTo:'Password do not match'
                },
                email:{
                    required:'Email is mandatory',
                    email:'Please enter a valid email address'
                },
                mobile:{
                    required:'Phone Number is mandatory',
                    digits:'phone number contain only digits'
                }

            }
        })
    }
})